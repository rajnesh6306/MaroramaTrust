const { appendRecord } = require("./fileStore");
const { required, phone, email, aadhar } = require("../utils/validation");

const fields = ["patientName", "aadharNumber", "dateBirth", "patientPhoneNumber", "patientEmail", "nameDiseases", "hospitalName"];

async function create(data) {
  for (const field of fields) {
    if (!required(data[field])) throw new Error(`${field} is required`);
  }
  if (!aadhar(data.aadharNumber)) throw new Error("Aadhar number must be 12 digits");
  if (!phone(data.patientPhoneNumber)) throw new Error("Phone number must be 10 digits");
  if (!email(data.patientEmail)) throw new Error("Please enter a valid email address");

  return appendRecord("user.txt", {
    type: "MEDICAL_HELP",
    patientName: String(data.patientName).trim(),
    aadharNumber: String(data.aadharNumber).trim(),
    dateBirth: String(data.dateBirth).trim(),
    patientReferenceName: String(data.patientReferenceName || "").trim(),
    patientPhoneNumber: String(data.patientPhoneNumber).trim(),
    patientEmail: String(data.patientEmail).trim(),
    nameDiseases: String(data.nameDiseases).trim(),
    hospitalName: String(data.hospitalName).trim(),
    referenceRegistrationNumber: String(data.referenceRegistrationNumber || "REF001").trim(),
  });
}

module.exports = { create };
