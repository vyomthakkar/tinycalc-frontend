// import { useState } from 'react';

// const Shader = () => {
//     const [input, setInput] = useState('Create a simple shader that pulses with red color');
//     const [shaderCode, setShaderCode] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [apiStatus, setApiStatus] = useState(null);

//     // Check if API is online
//     const checkApiStatus = async () => {
//         try {
//             const response = await fetch('https://tinycalc-backend.fly.dev');
//             const data = await response.json();
//             setApiStatus(data);
//         } catch (err) {
//             setApiStatus({ status: 'error', message: 'API is not responding' });
//         }
//     };

//     // Generate shader code
//     const generateShader = async () => {
//         setLoading(true);
//         setError(null);
        
//         try {
//             const response = await fetch('https://tinycalc-backend.fly.dev/api/shader/generate', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ input }),
//             });
            
//             const data = await response.json();
            
//             if (data.status === 'success') {
//                 setShaderCode(data.shader_code);
//             } else {
//                 setError(data.message || 'Failed to generate shader code');
//             }
//         } catch (err) {
//             setError('Error connecting to the API: ' + err.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
//             <h1>Shader Generator</h1>
            
//             {/* API Status Check */}
//             <div style={{ marginBottom: '20px' }}>
//                 <button 
//                     onClick={checkApiStatus}
//                     style={{ 
//                         padding: '8px 16px', 
//                         backgroundColor: '#eee', 
//                         border: '1px solid #ccc',
//                         borderRadius: '4px',
//                         marginRight: '10px'
//                     }}
//                 >
//                     Check API Status
//                 </button>
                
//                 {apiStatus && (
//                     <span>
//                         API Status: <strong>{apiStatus.status}</strong>
//                     </span>
//                 )}
//             </div>
            
//             {/* Input Field */}
//             <div style={{ marginBottom: '20px' }}>
//                 <textarea
//                     value={input}
//                     onChange={(e) => setInput(e.target.value)}
//                     style={{ 
//                         width: '100%', 
//                         height: '100px', 
//                         padding: '8px',
//                         borderRadius: '4px',
//                         border: '1px solid #ccc' 
//                     }}
//                     placeholder="Describe the shader you want to generate..."
//                 />
//             </div>
            
//             {/* Generate Button */}
//             <div style={{ marginBottom: '20px' }}>
//                 <button
//                     onClick={generateShader}
//                     disabled={loading || !input.trim()}
//                     style={{ 
//                         padding: '10px 20px', 
//                         backgroundColor: loading ? '#ccc' : '#007bff', 
//                         color: 'white',
//                         border: 'none',
//                         borderRadius: '4px',
//                         cursor: loading ? 'not-allowed' : 'pointer'
//                     }}
//                 >
//                     {loading ? 'Generating...' : 'Generate Shader'}
//                 </button>
//             </div>
            
//             {/* Error Message */}
//             {error && (
//                 <div style={{ 
//                     padding: '10px', 
//                     backgroundColor: '#f8d7da', 
//                     color: '#721c24',
//                     borderRadius: '4px',
//                     marginBottom: '20px'
//                 }}>
//                     {error}
//                 </div>
//             )}
            
//             {/* Shader Code Output */}
//             {shaderCode && (
//                 <div>
//                     <h3>Generated Shader Code:</h3>
//                     <pre style={{ 
//                         backgroundColor: '#f5f5f5', 
//                         padding: '15px',
//                         borderRadius: '4px',
//                         overflowX: 'auto',
//                         border: '1px solid #ccc'
//                     }}>
//                         {shaderCode}
//                     </pre>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Shader;


import { useState, useEffect, useRef } from 'react';

const Shader = () => {
    const [input, setInput] = useState('Create a simple shader that pulses with red color');
    const [shaderCode, setShaderCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiStatus, setApiStatus] = useState(null);
    const [renderError, setRenderError] = useState('');
    
    // Reference to canvas element
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const programRef = useRef(null);
    const glRef = useRef(null);

    // Check if API is online
    const checkApiStatus = async () => {
        try {
            const response = await fetch('https://tinycalc-backend.fly.dev');
            const data = await response.json();
            setApiStatus(data);
        } catch (err) {
            setApiStatus({ status: 'error', message: 'API is not responding' });
        }
    };

    // Generate shader code
    const generateShader = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('https://tinycalc-backend.fly.dev/api/shader/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                setShaderCode(data.shader_code);
            } else {
                setError(data.message || 'Failed to generate shader code');
            }
        } catch (err) {
            setError('Error connecting to the API: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Parse the shader code to extract vertex and fragment shaders
    const parseShaderCode = (code) => {
        if (!code) return { vertexShader: '', fragmentShader: '' };
        
        const vertexMatch = code.match(/\/\/ Vertex Shader[\s\S]*?(?=\/\/ Fragment Shader|$)/i);
        const fragmentMatch = code.match(/\/\/ Fragment Shader[\s\S]*$/i);
        
        return {
            vertexShader: vertexMatch ? vertexMatch[0].replace(/\/\/ Vertex Shader/i, '').trim() : '',
            fragmentShader: fragmentMatch ? fragmentMatch[0].replace(/\/\/ Fragment Shader/i, '').trim() : ''
        };
    };

    // Initialize and compile WebGL shaders whenever shaderCode changes
    useEffect(() => {
        if (!shaderCode || !canvasRef.current) return;
        
        // Clean up previous WebGL context if it exists
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        
        if (programRef.current && glRef.current) {
            glRef.current.deleteProgram(programRef.current);
        }
        
        setRenderError('');
        
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2'); // Using WebGL 2 for #version 300 es support
        glRef.current = gl;
        
        if (!gl) {
            setRenderError('WebGL 2 is not supported in your browser');
            return;
        }
        
        // Resize canvas to fit container
        const resizeCanvas = () => {
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;
            
            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Parse the vertex and fragment shaders from the API response
        const { vertexShader, fragmentShader } = parseShaderCode(shaderCode);
        
        // If we couldn't extract the shaders, use defaults
        const vertexShaderSource = vertexShader || `#version 300 es
        precision mediump float;
        
        in vec4 a_position;
        
        void main() {
            gl_Position = a_position;
        }`;
        
        const fragmentShaderSource = fragmentShader || `#version 300 es
        precision mediump float;
        
        out vec4 outColor;
        uniform float u_time;
        
        void main() {
            float pulse = abs(sin(u_time));
            outColor = vec4(pulse, 0.0, 0.0, 1.0);
        }`;
        
        // Try to compile shaders
        try {
            // Compile vertex shader
            const vShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vShader, vertexShaderSource);
            gl.compileShader(vShader);
            
            if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
                throw new Error(`Vertex shader error: ${gl.getShaderInfoLog(vShader)}`);
            }
            
            // Compile fragment shader
            const fShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fShader, fragmentShaderSource);
            gl.compileShader(fShader);
            
            if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
                throw new Error(`Fragment shader error: ${gl.getShaderInfoLog(fShader)}`);
            }
            
            // Link the program
            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vShader);
            gl.attachShader(shaderProgram, fShader);
            gl.linkProgram(shaderProgram);
            
            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw new Error(`Shader program error: ${gl.getProgramInfoLog(shaderProgram)}`);
            }
            
            programRef.current = shaderProgram;
            
            // Create buffer with a full-screen quad (two triangles)
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = [
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                1.0, 1.0,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            
            // Use the program
            gl.useProgram(shaderProgram);
            
            // Set up position attribute
            const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            gl.enableVertexAttribArray(positionAttribLocation);
            gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
            
            // Get uniform locations
            const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
            const resolutionLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
            
            // Animation loop
            let startTime = Date.now();
            
            const render = () => {
                const currentTime = (Date.now() - startTime) / 1000;
                
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                
                // Update time uniform if it exists
                if (timeLocation) {
                    gl.uniform1f(timeLocation, currentTime);
                }
                
                // Update resolution uniform if it exists
                if (resolutionLocation) {
                    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
                }
                
                // Draw the quad
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                
                animationRef.current = requestAnimationFrame(render);
            };
            
            render();
            
        } catch (err) {
            setRenderError(`Shader error: ${err.message}`);
        }
        
        // Cleanup function
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [shaderCode]);

    // Default shader code for first render
    useEffect(() => {
        if (!shaderCode) {
            setShaderCode(`// Vertex Shader
#version 300 es
precision mediump float;

in vec4 a_position;

void main() {
    gl_Position = a_position;
}

// Fragment Shader
#version 300 es
precision mediump float;

out vec4 outColor;
uniform float u_time;

void main() {
    float pulse = abs(sin(u_time));
    outColor = vec4(pulse, 0.0, 0.0, 1.0);
}`);
        }
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Shader Generator</h1>
            
            {/* API Status Check */}
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={checkApiStatus}
                    style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#eee', 
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        marginRight: '10px'
                    }}
                >
                    Check API Status
                </button>
                
                {apiStatus && (
                    <span>
                        API Status: <strong>{apiStatus.status}</strong>
                    </span>
                )}
            </div>
            
            {/* Input Field */}
            <div style={{ marginBottom: '20px' }}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{ 
                        width: '100%', 
                        height: '100px', 
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc' 
                    }}
                    placeholder="Describe the shader you want to generate..."
                />
            </div>
            
            {/* Generate Button */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={generateShader}
                    disabled={loading || !input.trim()}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: loading ? '#ccc' : '#007bff', 
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Generating...' : 'Generate Shader'}
                </button>
            </div>
            
            {/* Error Message */}
            {error && (
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#f8d7da', 
                    color: '#721c24',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}
            
            {/* WebGL Render Error */}
            {renderError && (
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#fff3cd', 
                    color: '#856404',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    {renderError}
                </div>
            )}
            
            {/* Shader Preview */}
            {shaderCode && (
                <div style={{ marginBottom: '20px' }}>
                    <h3>Shader Preview:</h3>
                    <canvas 
                        ref={canvasRef}
                        style={{ 
                            width: '100%', 
                            height: '300px', 
                            backgroundColor: '#000',
                            borderRadius: '4px'
                        }}
                    />
                </div>
            )}
            
            {/* Shader Code Output */}
            {shaderCode && (
                <div>
                    <h3>Generated Shader Code:</h3>
                    <pre style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '15px',
                        borderRadius: '4px',
                        overflowX: 'auto',
                        border: '1px solid #ccc'
                    }}>
                        {shaderCode}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default Shader;