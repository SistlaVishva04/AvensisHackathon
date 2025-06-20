import React from "react";
import googleformqr from "../assets/googleformqr.png.png"; // Make sure the path and name are correct
import Navbar from "../components/Navbar";

const QRCodePage: React.FC = () => {
  const formLink = "https://forms.gle/your-form-id"; // Replace with actual form link

  const copyLink = () => {
    navigator.clipboard.writeText(formLink);
    alert("Form link copied to clipboard!");
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-800 dark:text-white p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
          <h1 className="text-3xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text">
            Scan to Access the Google Form
          </h1>

          <img
            src={googleformqr}
            alt="Google Form QR Code"
            className="w-64 h-64 border-4 border-gray-300 dark:border-gray-600 rounded-xl shadow-lg transition-transform duration-300 hover:scale-105"
          />

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
            Point your mobile camera to this QR code to open the form instantly.
          </p>

          <button
            onClick={copyLink}
            className="mt-4 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            Copy Form Link
          </button>
        </div>
      </div>
    </>
  );
};

export default QRCodePage;
