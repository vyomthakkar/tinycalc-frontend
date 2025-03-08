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

  // Function to append operation to expression
  const appendOperation = (op) => {
    setExpression(prev => prev + op);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl shadow-2xl mt-6 border-2 border-gray-800">
      <h2 className="text-3xl font-mono font-bold text-white mb-6 text-center">
        <span className="text-indigo-400 drop-shadow-lg" style={{ textShadow: '0 0 12px rgba(129, 140, 248, 0.8)' }}>Calculator</span>
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 relative">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400 opacity-75" 
                style={{ animation: 'orbit1 3s linear infinite' }}></div>
              <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-75" 
                style={{ animation: 'orbit2 4s linear infinite' }}></div>
              <div className="absolute w-4 h-4 bg-indigo-500 rounded-full" 
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
            </div>
            <p className="text-indigo-300 mt-4 font-mono">Loading calculator...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex mx-auto max-w-md flex-col">
              <div className="bg-gray-800 p-3 rounded-t-lg border-t-2 border-l-2 border-r-2 border-gray-700 shadow-inner">
                {result !== '' && !error && (
                  <div className="text-right text-indigo-300 text-sm font-mono mb-1 opacity-80">
                    {expression} =
                  </div>
                )}
                <input
                  type="text"
                  value={expression}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Enter an expression"
                  className={`w-full bg-gray-900 text-white px-4 py-3 rounded font-mono border-2 transition-colors duration-200 outline-none text-left text-lg ${
                    inputFocused ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-gray-700'
                  }`}
                />
              </div>
              <button 
                onClick={calculateResult} 
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3 rounded-b-lg font-medium transition-all duration-200 flex items-center justify-center border-b-4 border-indigo-800 active:border-b-2 active:translate-y-0.5"
              >
                Calculate
              </button>
            </div>
          </div>

          {error ? (
            <div className="mx-auto bg-red-900/30 border-2 border-red-600 rounded-md mb-4 transition-all duration-300 overflow-hidden">
              <div className="flex flex-col items-center py-2 px-2">
                <span className="text-red-300 font-mono mb-0.5">Error:</span>
                <div className="text-red-200 font-mono text-center py-0.5">{error}</div>
              </div>
            </div>
          ) : result !== '' ? (
            <div className="mx-auto bg-indigo-900/30 border-2 border-indigo-600 rounded-md mb-4 transition-all duration-300 overflow-hidden">
              <div className="flex flex-col items-center py-2 px-2">
                <span className="text-indigo-300 font-mono mb-1">Result:</span>
                <div className="text-white text-xl font-mono font-bold text-center py-0.5"
                     style={{ textShadow: '0 0 8px rgba(129, 140, 248, 0.8)' }}>
                  {result}
                </div>
              </div>
            </div>
          ) : null}

          {/* Virtual calculator buttons */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {['(', ')', 'DEL', 'C'].map((btn) => (
              <button
                key={btn}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white rounded p-2 text-center font-mono text-lg transition-all duration-150 shadow-md active:shadow-inner border border-gray-600 active:translate-y-0.5"
                onClick={() => {
                  if (btn === 'C') {
                    setExpression('');
                  } else if (btn === 'DEL') {
                    setExpression(prev => prev.slice(0, -1));
                  } else {
                    appendOperation(btn);
                  }
                }}
              >
                {btn}
              </button>
            ))}
            
            {['7', '8', '9', '/'].map((btn) => (
              <button
                key={btn}
                className={`${btn === '/' ? 'bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 border-indigo-600' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 border-gray-700'} text-white rounded p-2 text-center font-mono text-lg transition-all duration-150 shadow-md active:shadow-inner border active:translate-y-0.5`}
                onClick={() => appendOperation(btn)}
              >
                {btn}
              </button>
            ))}
            
            {['4', '5', '6', '*'].map((btn) => (
              <button
                key={btn}
                className={`${btn === '*' ? 'bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 border-indigo-600' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 border-gray-700'} text-white rounded p-2 text-center font-mono text-lg transition-all duration-150 shadow-md active:shadow-inner border active:translate-y-0.5`}
                onClick={() => appendOperation(btn)}
              >
                {btn}
              </button>
            ))}
            
            {['1', '2', '3', '-'].map((btn) => (
              <button
                key={btn}
                className={`${btn === '-' ? 'bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 border-indigo-600' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 border-gray-700'} text-white rounded p-2 text-center font-mono text-lg transition-all duration-150 shadow-md active:shadow-inner border active:translate-y-0.5`}
                onClick={() => appendOperation(btn)}
              >
                {btn}
              </button>
            ))}
            
            {['0', '.', '=', '+'].map((btn) => (
              <button
                key={btn}
                className={`${btn === '+' || btn === '=' ? 'bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 border-indigo-600' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 border-gray-700'} text-white rounded p-2 text-center font-mono text-lg transition-all duration-150 shadow-md active:shadow-inner border active:translate-y-0.5`}
                onClick={() => btn === '=' ? calculateResult() : appendOperation(btn)}
              >
                {btn}
              </button>
            ))}
          </div>

          <div className="bg-gray-800/50 p-4 rounded-md border border-gray-700">
            <h3 className="text-lg font-mono text-indigo-400 mb-3" style={{ textShadow: '0 0 5px rgba(129, 140, 248, 0.5)' }}>
              Supported Operations:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer shadow-md hover:shadow-lg"
                onClick={() => setExpression("2 + 3")}
              >
                <div className="font-mono text-gray-400 text-sm">Add</div>
                <code className="text-white">2 + 3</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer shadow-md hover:shadow-lg"
                onClick={() => setExpression("5 - 2")}
              >
                <div className="font-mono text-gray-400 text-sm">Subtract</div>
                <code className="text-white">5 - 2</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer shadow-md hover:shadow-lg"
                onClick={() => setExpression("4 * 3")}
              >
                <div className="font-mono text-gray-400 text-sm">Multiply</div>
                <code className="text-white">4 * 3</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer shadow-md hover:shadow-lg"
                onClick={() => setExpression("10 / 2")}
              >
                <div className="font-mono text-gray-400 text-sm">Divide</div>
                <code className="text-white">10 / 2</code>
              </div>
              <div 
                className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 transition-colors duration-200 cursor-pointer md:col-span-2 shadow-md hover:shadow-lg"
                onClick={() => setExpression("(2 + 3) * 4")}
              >
                <div className="font-mono text-gray-400 text-sm">Parentheses / Composition</div>
                <code className="text-white">(2 + 3) * 4</code>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-gray-400 text-sm">
            <div className="flex items-center justify-center">
              <span className="text-indigo-400 font-mono" style={{ textShadow: '0 0 5px rgba(129, 140, 248, 0.5)' }}>Rust-powered</span>
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

