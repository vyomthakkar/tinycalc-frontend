import { useState, useEffect } from 'react';

const Calculator = () => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [wasmModule, setWasmModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);


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
    <div className="calculator-container">
      <h2>Rust WebAssembly Calculator</h2>
      
      {isLoading ? (
        <p>Loading calculator...</p>
      ) : (
        <>
          <div className="input-container">
            <input
              type="text"
              value={expression}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter an expression (e.g., 2+2, 3*(4+5))"
              className="expression-input"
            />
            <button onClick={calculateResult} className="calculate-button">
              Calculate
            </button>
          </div>

          {error ? (
            <div className="error-message">{error}</div>
          ) : result !== '' ? (
            <div className="result-container">
              <span className="result-label">Result:</span>
              <span className="result-value">{result}</span>
            </div>
          ) : null}

          <div className="instructions">
            <h3>Supported Operations:</h3>
            <ul>
              <li>Addition: <code>2 + 3</code></li>
              <li>Subtraction: <code>5 - 2</code></li>
              <li>Multiplication: <code>4 * 3</code></li>
              <li>Division: <code>10 / 2</code></li>
              <li>Parentheses: <code>(2 + 3) * 4</code></li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default Calculator;