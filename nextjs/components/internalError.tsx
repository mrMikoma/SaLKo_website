const InternalError = (props) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-red-600">
        500 - Internal Server Error
      </h1>
      <p className="mt-4 text-lg text-gray-700">
        Oho! Jotain meni pieleen palvelimella. Yritä myöhemmin uudelleen tai ota
        yhteyttä tukeen.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Lataa sivu uudelleen
      </button>
    </div>
  );
};

export default InternalError;
