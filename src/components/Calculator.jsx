import { useState, useEffect } from 'react';

const Calculator = () => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [wasmModule, setWasmModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  // Load the WASM module
  useEffect(() => {
    const loadWasm = async () => {
      try {
        setIsLoading(true);
        // Import the WASM module
        const rustModule = await import('../../rust-calculator/pkg/rust_calculator.js');
        
        // Initialize the module
        await rustModule.default();
        
        setWasmModule(rustModule);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load WASM module:', err);
        setError('Failed to load calculator. Please try again later.');
        setIsLoading(false);
      }
    };
  
    loadWasm();
  }, []);

  const handleInputChange = (e) => {
    setExpression(e.target.value);
  };

  const calculateResult = () => {
    if (!wasmModule || !expression.trim()) {
      return;
    }

    try {
      // Call the Rust function
      const calculatedResult = wasmModule.calculate(expression);
      setResult(calculatedResult);
      setError('');
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err.toString());
      setResult('');
    }
  };

  // Allow calculator to be invoked by pressing enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      calculateResult();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg mt-6">
      <h2 className="text-3xl font-mono font-bold text-white mb-6 text-center">
        Rust<span className="text-indigo-400">WASM</span> Calculator
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 relative">
              <div className="absolute inset-0 rounded-full border border-indigo-400 opacity-75" 
                style={{ animation: 'orbit1 3s linear infinite' }}></div>
              <div className="absolute inset-0 rounded-full border border-blue-400 opacity-75" 
                style={{ animation: 'orbit2 4s linear infinite' }}></div>
              <div className="absolute w-4 h-4 bg-indigo-500 rounded-full" 
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
            </div>
            <p className="text-indigo-300 mt-4 font-mono">Loading calculator...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex mx-auto max-w-2xl">
              <input
                type="text"
                value={expression}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Enter an expression (e.g., 2+2, 3*(4+5))"
                className={`w-full bg-gray-800 text-white px-4 py-3 rounded-l-md font-mono border-2 transition-colors duration-200 outline-none ${
                  inputFocused ? 'border-indigo-500' : 'border-gray-700'
                }`}
              />
              <button 
                onClick={calculateResult} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-r-md font-medium transition-colors duration-200 flex items-center"
              >
                Calculate
              </button>
            </div>
          </div>

          {error ? (
            <div className="max-w-md mx-auto bg-red-900/30 border border-red-600 rounded-md mb-6 transition-all duration-300 overflow-hidden">
              <div className="flex flex-col items-center p-4">
                <span className="text-red-300 font-mono mb-1">Error:</span>
                <div className="text-red-200 text-xl font-mono text-center py-1">{error}</div>
              </div>
            </div>
          ) : result !== '' ? (
            <div className="max-w-xs mx-auto bg-indigo-900/30 border border-indigo-600 rounded-md mb-6 transition-all duration-300 overflow-hidden">
              <div className="flex flex-col items-center p-4">
                <span className="text-indigo-300 font-mono mb-1">Result:</span>
                <div className="text-white text-xl font-mono font-bold text-center py-1">{result}</div>
              </div>
            </div>
          ) : null}

          <div className="bg-gray-900/50 p-5 rounded-md">
            <h3 className="text-lg font-mono text-indigo-400 mb-3">Supported Operations:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer"
                onClick={() => setExpression("2 + 3")}
              >
                <div className="font-mono text-gray-400 text-sm">Addition</div>
                <code className="text-white">2 + 3</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer"
                onClick={() => setExpression("5 - 2")}
              >
                <div className="font-mono text-gray-400 text-sm">Subtraction</div>
                <code className="text-white">5 - 2</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer"
                onClick={() => setExpression("4 * 3")}
              >
                <div className="font-mono text-gray-400 text-sm">Multiplication</div>
                <code className="text-white">4 * 3</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer"
                onClick={() => setExpression("10 / 2")}
              >
                <div className="font-mono text-gray-400 text-sm">Division</div>
                <code className="text-white">10 / 2</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer md:col-span-2"
                onClick={() => setExpression("(2 + 3) * 4")}
              >
                <div className="font-mono text-gray-400 text-sm">Parentheses</div>
                <code className="text-white">(2 + 3) * 4</code>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-gray-400 text-sm">
            <div className="flex items-center justify-center">
              <span className="text-indigo-400 font-mono">Rust-powered</span>
              <span className="mx-2">•</span>
              <span>Fast calculations on the frontend</span>
            </div>
          </div>
        </>
      )}
      
      {/* Add keyframes for loading animations */}
      <style jsx>{`
        @keyframes orbit1 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbit2 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
};

export default Calculator;