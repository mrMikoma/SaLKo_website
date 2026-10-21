"use client";

const PrintButton = () => (
  <button
    type="button"
    onClick={() => window.print()}
    className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued"
  >
    Tulosta tai tallenna PDF:ksi
  </button>
);

export default PrintButton;
