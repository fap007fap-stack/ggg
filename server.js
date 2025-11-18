const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/track/:number", async (req, res) => {
    const number = req.params.number;

    // Uruchamiamy Chromium w trybie headless i bez GPU
    const browser = await chromium.launch({
        headless: true,
        args: ["--disable-gpu", "--no-sandbox"]
    });

    const page = await browser.newPage();

    try {
        // Większy timeout, żeby Railway nie zabił procesu
        await page.goto("https://tracktrace.dpd.com.pl/", { waitUntil: "networkidle", timeout: 30000 });

        // Wyszukaj input paczki
        await page.fill("input[name='q']", number);
        await page.click("button[type='submit']");

        // Czekaj na tabelę z historią paczki
        await page.waitForSelector("table", { timeout: 30000 });

        const events = await page.$$eval("table tbody tr", rows =>
            rows.map(row => {
                const cols = Array.from(row.querySelectorAll("td"));
                return {
                    date: cols[0]?.innerText.trim() || "",
                    place: cols[1]?.innerText.trim() || "",
                    status: cols[2]?.innerText.trim() || ""
                };
            })
        );

        await browser.close();
        res.json({ success: true, trackingNumber: number, events });

    } catch (err) {
        await browser.close();
        console.error("Błąd backendu:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Używaj portu z Railway, domyślnie 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend działa na http://localhost:${PORT}`));
