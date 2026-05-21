import { useState } from 'react';

const StockLookup = () => {

  const [symbol, setSymbol] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => { 

    setError(null);
    setResult(null);

    e.preventDefault();

    try { 
        const res = await fetch(`http://localhost:8000/price?ticker=${symbol}`);
        const data = await res.json();

        if (!res.ok) { 
            setError(data.detail || "Stock data not found.");
        } else { 
            setResult(data);
        }

        console.log(data);
    } catch {
        setError("Failed to fetch stock price");
    }
}


//   return (
//     <div>
//       <h1>Stock Price Lookup</h1>
//       <form onSubmit={handleSubmit}>
//         <input value={symbol}
//           onChange={(e) => setSymbol(e.target.value)}
//           placeholder='Enter stock symbol'
//         />
//         <button type="submit">Submit</button>
//       </form>

//       {error && <p className="text-red-600">{error}</p>}
//       {result?.price_data && (
//         <div>
//           <p>Price: {result.price_data.vwap}</p>
//           <p>Timestamp: {result.price_data.timestamp}</p>
//         </div>
//       )}
//     </div>
//   )

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-gray-800">
        <h1 className="text-2xl font-bold mb-6 text-center">Stock Price Lookup</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Enter stock symbol"
            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
            type="submit"
            className="bg-blue-600 text-white rounded-md py-2 font-medium hover:bg-blue-700 transition"
            >
            Submit
            </button>
        </form>

        {error && (
            <p className="text-red-600 mt-4 text-center">{error}</p>
        )}

        {result?.price_data && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200 text-gray-800">
            <p><strong>Price:</strong> ${result.price_data.vwap}</p>
            <p><strong>Timestamp:</strong> {new Date(result.price_data.timestamp).toLocaleString()}</p>
            </div>
        )}
        </div>
      </div>
    );
}

export default StockLookup;
