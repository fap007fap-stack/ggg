
const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/track/:number", async (req, res) => {
    const number = req.params.number;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto("https://tracktrace.dpd.com.pl/", { waitUntil: "networkidle" });

        await page.fill("input[name='q']", number);
        await page.click("button[type='submit']");

        await page.waitForSelector("table", { timeout: 15000 });

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
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log("Backend działa na http://localhost:3000"));
