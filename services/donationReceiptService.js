const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ============================================================
// PATHS
// ============================================================

const logoPath = path.join(
    __dirname,
    "..",
    "public",
    "images",
    "logo.jpeg"
);

// ============================================================
// PAGE - A4 LANDSCAPE
// ============================================================

const PAGE = {
    width: 841.89,
    height: 595.28
};

// ============================================================
// COLORS
// ============================================================

const COLORS = {
    background: "#fffdf5",
    orange: "#f47b00",
    darkRed: "#8e1717",
    dark: "#222222",
    lightGold: "#d2a45c"
};

// ============================================================
// SAFE VALUE
// ============================================================

function safe(value, fallback = "Not Provided") {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return fallback;
    }

    return String(value).trim();
}

// ============================================================
// TRUNCATE
// ============================================================

function truncate(value, maxLength) {
    const text = safe(value, "");

    if (text.length <= maxLength) {
        return text;
    }

    return text.substring(0, maxLength - 3) + "...";
}

// ============================================================
// DATE
// ============================================================

function getDate(value) {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
        return new Date();
    }

    return date;
}

function formatDate(value) {
    return getDate(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// ============================================================
// VALID TILL
// ============================================================

function getValidTill(value) {
    const date = getDate(value);

    date.setFullYear(date.getFullYear() + 1);
    date.setDate(date.getDate() - 1);

    return formatDate(date);
}

// ============================================================
// AMOUNT
// ============================================================

function formatAmount(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "0.00";
    }

    return amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ============================================================
// NUMBER TO WORDS
// ============================================================

function numberToWordsIndian(number) {
    const num = Math.floor(Number(number));

    if (!Number.isFinite(num) || num <= 0) {
        return "Zero Rupees Only";
    }

    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen"
    ];

    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety"
    ];

    function twoDigits(n) {
        if (n < 20) {
            return ones[n];
        }

        return (
            tens[Math.floor(n / 10)] +
            (n % 10 ? " " + ones[n % 10] : "")
        );
    }

    function convert(n) {
        let result = "";

        if (n >= 10000000) {
            result +=
                convert(Math.floor(n / 10000000)) +
                " Crore ";
            n %= 10000000;
        }

        if (n >= 100000) {
            result +=
                convert(Math.floor(n / 100000)) +
                " Lakh ";
            n %= 100000;
        }

        if (n >= 1000) {
            result +=
                convert(Math.floor(n / 1000)) +
                " Thousand ";
            n %= 1000;
        }

        if (n >= 100) {
            result +=
                ones[Math.floor(n / 100)] +
                " Hundred ";
            n %= 100;
        }

        if (n > 0) {
            if (result.trim()) {
                result += "and ";
            }

            result += twoDigits(n);
        }

        return result.trim();
    }

    return `${convert(num)} Rupees Only`;
}

// ============================================================
// CERTIFICATE NUMBER
// ============================================================

function generateCertificateNumber(data) {
    if (data.receiptNumber) {
        return safe(data.receiptNumber);
    }

    const transactionId = safe(
        data.txnid || data.transactionId,
        ""
    );

    const cleanId = transactionId
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-10);

    if (cleanId) {
        return `MCT${cleanId.toUpperCase()}`;
    }

    return `MCT${Date.now()}`;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

function generateDonationReceipt(data) {

    return new Promise((resolve, reject) => {

        try {

            const doc = new PDFDocument({
                size: "A4",
                layout: "landscape",
                margin: 0,
                autoFirstPage: true,

                info: {
                    Title:
                        "Donation Certificate - Manorama Charitable Trust",

                    Author:
                        "Manorama Charitable Trust",

                    Subject:
                        "Donation Certificate",

                    Keywords:
                        "Donation Certificate, Manorama Charitable Trust"
                }
            });

            const chunks = [];

            doc.on("data", (chunk) => {
                chunks.push(chunk);
            });

            doc.on("end", () => {
                resolve(Buffer.concat(chunks));
            });

            doc.on("error", (error) => {
                reject(error);
            });

            // Draw certificate

            drawBackground(doc);
            drawBorder(doc);
            drawTopTaglines(doc);
            drawLogo(doc);
            drawTitle(doc);
            drawMainContent(doc, data);
            drawInformationBox(doc, data);
            drawRegards(doc);
            drawBottomWave(doc);

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// ============================================================
// BACKGROUND
// ============================================================

function drawBackground(doc) {

    doc
        .rect(
            0,
            0,
            PAGE.width,
            PAGE.height
        )
        .fill(COLORS.background);
}

// ============================================================
// BORDER
// ============================================================

function drawBorder(doc) {

    // Outer orange frame

    doc
        .rect(
            8,
            8,
            PAGE.width - 16,
            PAGE.height - 16
        )
        .lineWidth(7)
        .stroke(COLORS.orange);

    // White separation

    doc
        .rect(
            21,
            21,
            PAGE.width - 42,
            PAGE.height - 42
        )
        .lineWidth(2)
        .stroke("#ffffff");

    // Inner orange frame

    doc
        .rect(
            31,
            31,
            PAGE.width - 62,
            PAGE.height - 62
        )
        .lineWidth(2)
        .stroke(COLORS.orange);

    // Inner thin frame

    doc
        .rect(
            39,
            39,
            PAGE.width - 78,
            PAGE.height - 78
        )
        .lineWidth(0.7)
        .stroke(COLORS.lightGold);
}

// ============================================================
// TOP TAGLINES
// ============================================================

function drawTopTaglines(doc) {

    // Left

    doc
        .font("Times-Italic")
        .fontSize(13)
        .fillColor(COLORS.dark)
        .text(
            "Service to Humanity",
            53,
            47,
            {
                width: 220
            }
        );

    doc
        .font("Times-Italic")
        .fontSize(13)
        .text(
            "is the Greatest Dharma",
            53,
            64,
            {
                width: 220
            }
        );

    // Right

    doc
        .font("Times-Italic")
        .fontSize(13)
        .text(
            "Together",
            640,
            47,
            {
                width: 150,
                align: "center"
            }
        );

    doc
        .font("Times-Italic")
        .fontSize(12.5)
        .text(
            "for a Healthier, Kinder",
            620,
            64,
            {
                width: 190,
                align: "center"
            }
        );

    doc
        .font("Times-Italic")
        .fontSize(12.5)
        .text(
            "and Brighter Tomorrow",
            620,
            81,
            {
                width: 190,
                align: "center"
            }
        );
}

// ============================================================
// LOGO
// ============================================================

function drawLogo(doc) {

    if (!fs.existsSync(logoPath)) {
        console.log("⚠️ Logo not found:", logoPath);
        return;
    }

    try {

        doc.image(
            logoPath,
            337,
            45,
            {
                fit: [168, 155]
            }
        );

    } catch (error) {

        console.error(
            "⚠️ Logo rendering failed:",
            error.message
        );
    }
}

// ============================================================
// TITLE
// ============================================================

function drawTitle(doc) {

    doc
        .font("Times-Bold")
        .fontSize(38)
        .fillColor(COLORS.darkRed)
        .text(
            "Donation Certificate",
            185,
            202,
            {
                width: 470,
                align: "center"
            }
        );

    // Decorative line

    doc
        .moveTo(330, 249)
        .lineTo(510, 249)
        .lineWidth(0.8)
        .stroke(COLORS.darkRed);

    doc
        .font("Times-Roman")
        .fontSize(8.5)
        .fillColor(COLORS.dark)
        .text(
            "WITH GRATITUDE AND APPRECIATION",
            275,
            255,
            {
                width: 290,
                align: "center"
            }
        );
}

// ============================================================
// MAIN CONTENT
// ============================================================

function drawMainContent(doc, data) {

    const donorName = truncate(
        safe(data.donorName),
        38
    );

    const amount = Number(data.amount) || 0;

    const amountWords =
        numberToWordsIndian(amount);

    const cause = safe(
        data.causeForDonation,
        "General Donation"
    );

    // Intro

    doc
        .font("Times-Roman")
        .fontSize(14)
        .fillColor(COLORS.dark)
        .text(
            "This is to certify that",
            185,
            278,
            {
                width: 470,
                align: "center"
            }
        );

    // Donor

    doc
        .font("Times-BoldItalic")
        .fontSize(25)
        .fillColor(COLORS.darkRed)
        .text(
            donorName,
            175,
            299,
            {
                width: 490,
                align: "center"
            }
        );

    // Contribution

    doc
        .font("Times-Roman")
        .fontSize(12.5)
        .fillColor(COLORS.dark)
        .text(
            "has generously contributed a donation to Manorama Charitable Trust",
            185,
            338,
            {
                width: 470,
                align: "center"
            }
        );

    doc
        .text(
            "towards our humanitarian initiatives for",
            185,
            357,
            {
                width: 470,
                align: "center"
            }
        );

    // Cause

    doc
        .font("Times-Bold")
        .fontSize(12)
        .text(
            truncate(cause, 82),
            185,
            377,
            {
                width: 470,
                align: "center"
            }
        );

    // Support message

    doc
        .font("Times-Roman")
        .fontSize(12.5)
        .text(
            "Your kindness and support help us in building a healthier,",
            185,
            405,
            {
                width: 470,
                align: "center"
            }
        );

    doc
        .text(
            "stronger and more compassionate society.",
            185,
            424,
            {
                width: 470,
                align: "center"
            }
        );

    // Thank you

    doc
        .font("Times-Italic")
        .fontSize(13)
        .fillColor(COLORS.darkRed)
        .text(
            "Thank you for being a part of our mission",
            185,
            450,
            {
                width: 470,
                align: "center"
            }
        );

    doc
        .text(
            "for a better tomorrow.",
            185,
            468,
            {
                width: 470,
                align: "center"
            }
        );

    // Amount in words

    doc
        .font("Times-Italic")
        .fontSize(7.5)
        .fillColor("#555555")
        .text(
            `Donation Amount in Words: ${truncate(amountWords, 65)}`,
            215,
            495,
            {
                width: 420,
                align: "center"
            }
        );
}

// ============================================================
// INFORMATION BOX
// ============================================================

function drawInformationBox(doc, data) {

    const certificateNo =
        generateCertificateNumber(data);

    const donationDate =
        formatDate(data.paymentDate);

    const amount =
        `Rs. ${formatAmount(data.amount)}/-`;

    const paymentMode =
        safe(data.paymentMode, "Online");

    const validTill =
        getValidTill(data.paymentDate);

    const boxX = 47;
    const boxY = 430;

    const boxWidth = 218;
    const boxHeight = 103;

    // Box

    doc
        .roundedRect(
            boxX,
            boxY,
            boxWidth,
            boxHeight,
            11
        )
        .lineWidth(1)
        .stroke(COLORS.lightGold);

    // Rows

    const labelX = boxX + 10;
    const valueX = boxX + 87;

    const rows = [
        {
            label: "Certificate No.",
            value: certificateNo
        },
        {
            label: "Donation Date",
            value: donationDate
        },
        {
            label: "Amount",
            value: amount
        },
        {
            label: "Mode of Payment",
            value: paymentMode
        },
        {
            label: "Valid Till",
            value: validTill
        }
    ];

    const startY = boxY + 10;
    const rowHeight = 17;

    rows.forEach((row, index) => {

        const y =
            startY +
            index * rowHeight;

        doc
            .font("Times-Bold")
            .fontSize(8)
            .fillColor(COLORS.dark)
            .text(
                row.label,
                labelX,
                y,
                {
                    width: 73,
                    height: 11
                }
            );

        doc
            .font("Times-Roman")
            .fontSize(8)
            .text(
                ":  " + truncate(row.value, 21),
                valueX,
                y,
                {
                    width: 120,
                    height: 11
                }
            );
    });

    // Validity note

    doc
        .font("Times-Italic")
        .fontSize(6.5)
        .fillColor("#555555")
        .text(
            "Valid for 1 Year from the date of issue",
            boxX + 5,
            boxY + 89,
            {
                width: boxWidth - 10,
                align: "center"
            }
        );
}

// ============================================================
// RIGHT SIDE REGARDS
// ============================================================

function drawRegards(doc) {

    const x = 605;
    const width = 190;

    // Top line

    doc
        .moveTo(
            x + 35,
            461
        )
        .lineTo(
            x + 145,
            461
        )
        .lineWidth(0.8)
        .stroke(COLORS.darkRed);

    // Warm Regards

    doc
        .font("Times-Roman")
        .fontSize(13)
        .fillColor(COLORS.dark)
        .text(
            "Warm Regards,",
            x,
            465,
            {
                width,
                align: "center"
            }
        );

    // Trust name

    doc
        .font("Times-Bold")
        .fontSize(12)
        .fillColor(COLORS.darkRed)
        .text(
            "Manorama Charitable Trust",
            x - 15,
            485,
            {
                width: width + 30,
                align: "center"
            }
        );

    // Bottom decorative line

    const lineY = 508;

    doc
        .moveTo(
            x + 40,
            lineY
        )
        .lineTo(
            x + 150,
            lineY
        )
        .lineWidth(0.7)
        .stroke(COLORS.darkRed);

    // --------------------------------------------------------
    // FIXED DIAMOND
    // PDFKit does NOT have doc.polygon().
    // Draw the diamond manually.
    // --------------------------------------------------------

    doc
        .moveTo(x + 93, lineY - 5)
        .lineTo(x + 98, lineY)
        .lineTo(x + 93, lineY + 5)
        .lineTo(x + 88, lineY)
        .closePath()
        .fill(COLORS.darkRed);
}

// ============================================================
// BOTTOM WAVE
// ============================================================

function drawBottomWave(doc) {

    // Orange wave

    doc
        .moveTo(42, 552)
        .bezierCurveTo(
            170,
            536,
            270,
            558,
            390,
            546
        )
        .bezierCurveTo(
            510,
            534,
            625,
            555,
            735,
            545
        )
        .bezierCurveTo(
            785,
            541,
            815,
            533,
            842,
            520
        )
        .lineTo(842, 596)
        .lineTo(42, 596)
        .closePath()
        .fill(COLORS.orange);

    // White wave

    doc
        .moveTo(42, 559)
        .bezierCurveTo(
            170,
            548,
            270,
            570,
            390,
            557
        )
        .bezierCurveTo(
            510,
            545,
            620,
            568,
            735,
            557
        )
        .bezierCurveTo(
            785,
            553,
            815,
            546,
            842,
            533
        )
        .lineTo(842, 569)
        .bezierCurveTo(
            790,
            580,
            700,
            577,
            620,
            571
        )
        .bezierCurveTo(
            510,
            563,
            440,
            578,
            350,
            571
        )
        .bezierCurveTo(
            230,
            562,
            135,
            578,
            42,
            571
        )
        .closePath()
        .fill(COLORS.background);

    // Footer

    doc
        .font("Times-Bold")
        .fontSize(7)
        .fillColor(COLORS.darkRed)
        .text(
            "HEALTHY PEOPLE   |   EMPOWERED COMMUNITIES   |   A BETTER TOMORROW",
            205,
            578,
            {
                width: 430,
                align: "center"
            }
        );
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    generateDonationReceipt
};