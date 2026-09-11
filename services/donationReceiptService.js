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
// PAGE SETTINGS
// ============================================================

const PAGE = {
    width: 595.28,
    height: 841.89,

    left: 50,
    right: 545,

    contentWidth: 495,

    footerTop: 760
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
// RECEIPT NUMBER
// ============================================================

function generateReceiptNumber(data) {

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
        return `MCT-${cleanId.toUpperCase()}`;
    }

    return `MCT-${Date.now()}`;
}


// ============================================================
// GENERATE DONATION RECEIPT
// ============================================================

function generateDonationReceipt(data) {

    return new Promise((resolve, reject) => {

        try {

            const doc = new PDFDocument({
                size: "A4",

                margin: 0,

                autoFirstPage: true,

                info: {
                    Title:
                        "Donation Receipt - Manorama Charitable Trust",

                    Author:
                        "Manorama Charitable Trust",

                    Subject:
                        "Official Donation Acknowledgement",

                    Keywords:
                        "Donation, Receipt, Manorama Charitable Trust"
                }
            });


            // ====================================================
            // BUFFER
            // ====================================================

            const chunks = [];

            doc.on("data", chunk => {
                chunks.push(chunk);
            });

            doc.on("end", () => {

                resolve(
                    Buffer.concat(chunks)
                );

            });

            doc.on("error", error => {
                reject(error);
            });


            // ====================================================
            // PAGE FRAME
            // ====================================================

            drawPageFrame(doc);


            // ====================================================
            // HEADER
            // ====================================================

            drawHeader(doc);


            // ====================================================
            // TITLE
            // ====================================================

            drawTitle(doc);


            // ====================================================
            // RECEIPT META
            // ====================================================

            drawReceiptMeta(
                doc,
                generateReceiptNumber(data),
                formatDate(data.paymentDate)
            );


            // ====================================================
            // DONOR INFORMATION
            // ====================================================

            drawSectionTitle(
                doc,
                "DONOR INFORMATION",
                245
            );

            drawFieldPair(
                doc,
                272,

                "DONOR NAME",
                safe(data.donorName),

                "PHONE NUMBER",
                safe(data.phoneNumber)
            );

            drawFieldPair(
                doc,
                315,

                "EMAIL ADDRESS",
                safe(data.email),

                "PAYMENT MODE",
                safe(data.paymentMode)
            );


            // ====================================================
            // DONATION DETAILS
            // ====================================================

            drawSectionTitle(
                doc,
                "DONATION DETAILS",
                360
            );

            drawFieldPair(
                doc,
                387,

                "DONATION PURPOSE",
                safe(data.causeForDonation),

                "PAYMENT STATUS",
                "SUCCESS"
            );


            // ====================================================
            // AMOUNT
            // ====================================================

            drawAmountBox(
                doc,
                data.amount,
                425
            );


            // ====================================================
            // TRANSACTION DETAILS
            // ====================================================

            drawSectionTitle(
                doc,
                "TRANSACTION DETAILS",
                520
            );

            drawTransactionRow(
                doc,
                548,
                "Transaction ID",
                safe(
                    data.txnid ||
                    data.transactionId
                )
            );

            drawTransactionRow(
                doc,
                574,
                "PayU Payment ID",
                safe(
                    data.mihpayid ||
                    data.payuPaymentId
                )
            );

            drawTransactionRow(
                doc,
                600,
                "Payment Date",
                formatDate(data.paymentDate)
            );


            // ====================================================
            // DONOR MESSAGE
            // ====================================================

            let acknowledgementY = 650;

            if (
                data.message &&
                String(data.message).trim()
            ) {

                drawSectionTitle(
                    doc,
                    "DONOR MESSAGE",
                    625
                );

                drawMessageBox(
                    doc,
                    data.message,
                    650
                );

                acknowledgementY = 705;
            }


            // ====================================================
            // ACKNOWLEDGEMENT
            // ====================================================

            drawAcknowledgement(
                doc,
                acknowledgementY
            );


            // ====================================================
            // FOOTER
            // ====================================================

            drawFooter(doc);


            // ====================================================
            // FINALIZE
            // ====================================================

            doc.end();

        } catch (error) {

            reject(error);

        }

    });

}


// ============================================================
// PAGE FRAME
// ============================================================

function drawPageFrame(doc) {

    doc
        .roundedRect(
            25,
            25,
            PAGE.width - 50,
            PAGE.height - 50,
            8
        )
        .lineWidth(0.8)
        .stroke();
}


// ============================================================
// HEADER
// ============================================================

function drawHeader(doc) {

    const logoExists =
        fs.existsSync(logoPath);


    // --------------------------------------------------------
    // LOGO
    // --------------------------------------------------------

    if (logoExists) {

        doc.image(
            logoPath,
            50,
            45,
            {
                fit: [70, 70]
            }
        );

    }


    // --------------------------------------------------------
    // TRUST NAME
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(
            "MANORAMA CHARITABLE TRUST",
            135,
            49,
            {
                width: 390,
                height: 24
            }
        );


    // --------------------------------------------------------
    // ORGANIZATION TYPE
    // --------------------------------------------------------

    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            "Charitable & Social Welfare Organization",
            135,
            77,
            {
                width: 390
            }
        );


    // --------------------------------------------------------
    // TAGLINE
    // --------------------------------------------------------

    doc
        .font("Helvetica")
        .fontSize(8)
        .text(
            "Serving with compassion, dignity and commitment",
            135,
            94,
            {
                width: 390
            }
        );


    // --------------------------------------------------------
    // HEADER DIVIDER
    // --------------------------------------------------------

    doc
        .moveTo(50, 130)
        .lineTo(545, 130)
        .lineWidth(0.8)
        .stroke();
}


// ============================================================
// TITLE
// ============================================================

function drawTitle(doc) {

    doc
        .font("Helvetica-Bold")
        .fontSize(21)
        .text(
            "DONATION RECEIPT",
            50,
            151,
            {
                width: 495,
                align: "center"
            }
        );


    doc
        .font("Helvetica")
        .fontSize(9.5)
        .text(
            "Official Donation Acknowledgement",
            50,
            178,
            {
                width: 495,
                align: "center"
            }
        );


    doc
        .font("Helvetica")
        .fontSize(8.5)
        .text(
            "Thank you for your valuable contribution to Manorama Charitable Trust.",
            50,
            195,
            {
                width: 495,
                align: "center"
            }
        );
}


// ============================================================
// RECEIPT META
// ============================================================

function drawReceiptMeta(
    doc,
    receiptNumber,
    receiptDate
) {

    const y = 218;


    // --------------------------------------------------------
    // LEFT
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(
            "RECEIPT NUMBER",
            50,
            y,
            {
                width: 220
            }
        );


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            receiptNumber,
            50,
            y + 12,
            {
                width: 220
            }
        );


    // --------------------------------------------------------
    // RIGHT
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(
            "RECEIPT DATE",
            305,
            y,
            {
                width: 240
            }
        );


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            receiptDate,
            305,
            y + 12,
            {
                width: 240
            }
        );
}


// ============================================================
// SECTION TITLE
// ============================================================

function drawSectionTitle(
    doc,
    title,
    y
) {

    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            title,
            50,
            y,
            {
                width: 495
            }
        );


    doc
        .moveTo(50, y + 16)
        .lineTo(545, y + 16)
        .lineWidth(0.45)
        .stroke();
}


// ============================================================
// FIELD PAIR
// ============================================================

function drawFieldPair(
    doc,
    y,
    label1,
    value1,
    label2,
    value2
) {

    const leftX = 50;
    const rightX = 305;

    const width = 220;


    // --------------------------------------------------------
    // LEFT LABEL
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(7.2)
        .text(
            label1,
            leftX,
            y,
            {
                width
            }
        );


    // --------------------------------------------------------
    // LEFT VALUE
    // --------------------------------------------------------

    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            truncate(value1, 48),
            leftX,
            y + 12,
            {
                width,
                height: 15,
                ellipsis: true
            }
        );


    // --------------------------------------------------------
    // RIGHT LABEL
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(7.2)
        .text(
            label2,
            rightX,
            y,
            {
                width
            }
        );


    // --------------------------------------------------------
    // RIGHT VALUE
    // --------------------------------------------------------

    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            truncate(value2, 48),
            rightX,
            y + 12,
            {
                width,
                height: 15,
                ellipsis: true
            }
        );
}


// ============================================================
// AMOUNT BOX
// ============================================================

function drawAmountBox(
    doc,
    amount,
    y
) {

    doc
        .roundedRect(
            50,
            y,
            495,
            73,
            8
        )
        .lineWidth(0.8)
        .stroke();


    // --------------------------------------------------------
    // LABEL
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(
            "DONATION AMOUNT",
            50,
            y + 12,
            {
                width: 495,
                align: "center"
            }
        );


    // --------------------------------------------------------
    // AMOUNT
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .text(
            `Rs. ${formatAmount(amount)}`,
            50,
            y + 28,
            {
                width: 495,
                align: "center"
            }
        );
}


// ============================================================
// TRANSACTION ROW
// ============================================================

function drawTransactionRow(
    doc,
    y,
    label,
    value
) {

    // --------------------------------------------------------
    // LABEL
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(
            label,
            50,
            y,
            {
                width: 135
            }
        );


    // --------------------------------------------------------
    // VALUE
    // --------------------------------------------------------

    doc
        .font("Helvetica")
        .fontSize(8.5)
        .text(
            truncate(value, 70),
            195,
            y,
            {
                width: 350,
                height: 14,
                ellipsis: true
            }
        );
}


// ============================================================
// MESSAGE BOX
// ============================================================

function drawMessageBox(
    doc,
    message,
    y
) {

    const cleanMessage =
        truncate(
            safe(message),
            110
        );


    doc
        .roundedRect(
            50,
            y,
            495,
            38,
            6
        )
        .lineWidth(0.45)
        .stroke();


    doc
        .font("Helvetica")
        .fontSize(8.5)
        .text(
            cleanMessage,
            62,
            y + 11,
            {
                width: 471,
                height: 16,
                ellipsis: true
            }
        );
}


// ============================================================
// ACKNOWLEDGEMENT
// ============================================================

function drawAcknowledgement(
    doc,
    y
) {

    const height = 52;


    doc
        .roundedRect(
            50,
            y,
            495,
            height,
            7
        )
        .lineWidth(0.45)
        .stroke();


    doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(
            "THANK YOU FOR YOUR GENEROUS SUPPORT",
            60,
            y + 9,
            {
                width: 475,
                align: "center"
            }
        );


    doc
        .font("Helvetica")
        .fontSize(7.5)
        .text(
            "This receipt acknowledges the successful receipt of your donation.",
            60,
            y + 25,
            {
                width: 475,
                align: "center"
            }
        );


    doc
        .font("Helvetica")
        .fontSize(7)
        .text(
            "Receipt generated electronically. No physical signature is required.",
            60,
            y + 38,
            {
                width: 475,
                align: "center"
            }
        );
}


// ============================================================
// FOOTER
// ============================================================

function drawFooter(doc) {

    const y = PAGE.footerTop;


    // --------------------------------------------------------
    // DIVIDER
    // --------------------------------------------------------

    doc
        .moveTo(50, y)
        .lineTo(545, y)
        .lineWidth(0.5)
        .stroke();


    // --------------------------------------------------------
    // TRUST NAME
    // --------------------------------------------------------

    doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "MANORAMA CHARITABLE TRUST",
            50,
            y + 13,
            {
                width: 495,
                align: "center"
            }
        );


    // --------------------------------------------------------
    // FOOTER TEXT
    // --------------------------------------------------------

    doc
        .font("Helvetica")
        .fontSize(7)
        .text(
            "Donation acknowledgement • Generated electronically",
            50,
            y + 27,
            {
                width: 495,
                align: "center"
            }
        );
}


// ============================================================
// TRUNCATE TEXT
// ============================================================

function truncate(
    value,
    maxLength
) {

    const text =
        safe(value, "");


    if (text.length <= maxLength) {
        return text;
    }


    return (
        text.substring(
            0,
            maxLength - 3
        ) + "..."
    );
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

    const date =
        value
            ? new Date(value)
            : new Date();


    if (Number.isNaN(date.getTime())) {

        return new Date()
            .toLocaleString("en-IN");
    }


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// ============================================================
// FORMAT AMOUNT
// ============================================================

function formatAmount(value) {

    const amount =
        Number(value);


    if (!Number.isFinite(amount)) {
        return "0.00";
    }


    return amount.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    generateDonationReceipt
};