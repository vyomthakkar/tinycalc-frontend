import { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Shader = () => {
    const [input, setInput] = useState('A rotating cube with a gradient background');
    const [shaderCode, setShaderCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [renderError, setRenderError] = useState('');
    const [copied, setCopied] = useState(false);
    const [lastErrorInput, setLastErrorInput] = useState(''); // Store input that caused error, will be sent to the API to correct the shader code
    const [retrying, setRetrying] = useState(false); // Track if in retry mode

    // sample prompts
    const [samplePrompts] = useState([
        "A rotating cube with a gradient background",
        "Colorful plasma effect with moving waves",
        "Northern Lights (aurora borealis)",
    ]);
    
    // Reference to canvas element
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const programRef = useRef(null);
    const glRef = useRef(null);

    // Function to copy code to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(shaderCode)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    };

    // Generate shader code
    const generateShader = async () => {
        setLoading(true);
        setError(null);
        setRenderError('');
        setRetrying(false);
        
        try {
            const response = await fetch('https://tinycalc-backend.fly.dev/api/shader/generate', {
            // const response = await fetch('http://localhost:4000/api/shader/generate', {
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
    
    // Correct shader code when there was an error
    const correctShader = async () => {
        setLoading(true);
        setRetrying(true);
        
        try {
            const response = await fetch('https://tinycalc-backend.fly.dev/api/shader/correct', {
            // const response = await fetch('http://localhost:4000/api/shader/correct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    original_query: lastErrorInput,
                    shader_code: shaderCode,
                    error_message: renderError
                }),
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                setShaderCode(data.shader_code);
                setRenderError(''); // Clear error if correction succeeds
            } else {
                setError(data.message || 'Failed to correct shader code');
            }
        } catch (err) {
            setError('Error connecting to the API: ' + err.message);
        } finally {
            setLoading(false);
            setRetrying(false);
        }
    };

    // Enhanced shader parser that handles different formats and strips markdown
    const parseShaderCode = (code) => {
        if (!code) return { vertexShader: '', fragmentShader: '' };
        
        // strip unwanted markdown 
        code = code.replace(/```(?:glsl|c|cpp)?\n?/g, '');  // Remove opening code fences with optional language
        code = code.replace(/```\n?/g, '');  // Remove closing code fences
        code = code.replace(/`([^`]+)`/g, '$1');  // Remove inline code backticks
        
        // Remove any other non-standard characters that might cause shader compilation issues
        code = code.replace(/[""'']/g, '"');  // Replace smart quotes with standard quotes
        
        console.log("Cleaned shader code:", code);
        
        // Try to match with various possible delimiters
        const vertexPatterns = [
            /\/\/ Vertex Shader[\s\S]*?(?=\/\/ Fragment Shader|$)/i,
            /\/\* Vertex Shader \*\/[\s\S]*?(?=\/\* Fragment Shader|$)/i,
            /#ifdef VERTEX_SHADER[\s\S]*?(?=#endif[\s\S]*?#ifdef FRAGMENT_SHADER|$)/i,
            /\/\/ BEGIN VERTEX SHADER[\s\S]*?(?=\/\/ END VERTEX SHADER)/i
        ];
        
        const fragmentPatterns = [
            /\/\/ Fragment Shader[\s\S]*$/i,
            /\/\* Fragment Shader \*\/[\s\S]*$/i,
            /#ifdef FRAGMENT_SHADER[\s\S]*?(?=#endif|$)/i,
            /\/\/ BEGIN FRAGMENT SHADER[\s\S]*?(?=\/\/ END FRAGMENT SHADER|$)/i
        ];
        
        // Try each pattern until we find a match
        let vertexShader = '';
        let fragmentShader = '';
        
        for (const pattern of vertexPatterns) {
            const match = code.match(pattern);
            if (match) {
                vertexShader = match[0].replace(/\/\/ Vertex Shader|\/\* Vertex Shader \*\/|#ifdef VERTEX_SHADER|\/\/ BEGIN VERTEX SHADER/i, '').trim();
                if (vertexShader.endsWith('#endif')) {
                    vertexShader = vertexShader.substring(0, vertexShader.lastIndexOf('#endif')).trim();
                }
                if (vertexShader.endsWith('// END VERTEX SHADER')) {
                    vertexShader = vertexShader.substring(0, vertexShader.lastIndexOf('// END VERTEX SHADER')).trim();
                }
                break;
            }
        }
        
        for (const pattern of fragmentPatterns) {
            const match = code.match(pattern);
            if (match) {
                fragmentShader = match[0].replace(/\/\/ Fragment Shader|\/\* Fragment Shader \*\/|#ifdef FRAGMENT_SHADER|\/\/ BEGIN FRAGMENT SHADER/i, '').trim();
                if (fragmentShader.endsWith('#endif')) {
                    fragmentShader = fragmentShader.substring(0, fragmentShader.lastIndexOf('#endif')).trim();
                }
                if (fragmentShader.endsWith('// END FRAGMENT SHADER')) {
                    fragmentShader = fragmentShader.substring(0, fragmentShader.lastIndexOf('// END FRAGMENT SHADER')).trim();
                }
                break;
            }
        }
        
        // If we still couldn't find a match, try a last resort approach:
        // Look for two distinct shader blocks (one with vertex/position, one with fragment/color)
        if (!vertexShader || !fragmentShader) {
            const codeBlocks = code.split(/\/\/[\s-]*|\/\*[\s-]*\*\/|#ifdef|#endif/i)
                .filter(block => block.trim().length > 0);
                
            if (codeBlocks.length >= 2) {
                // Assign the first block that mentions position to vertex shader
                // and the first block that mentions color to fragment shader
                for (const block of codeBlocks) {
                    if (!vertexShader && (block.includes('position') || block.includes('gl_Position'))) {
                        vertexShader = block.trim();
                    } else if (!fragmentShader && (block.includes('color') || block.includes('gl_FragColor') || block.includes('outColor'))) {
                        fragmentShader = block.trim();
                    }
                    
                    if (vertexShader && fragmentShader) break;
                }
            }
            
            // If we still don't have both, just use the first and second blocks
            if (codeBlocks.length >= 2 && (!vertexShader || !fragmentShader)) {
                vertexShader = vertexShader || codeBlocks[0].trim();
                fragmentShader = fragmentShader || codeBlocks[1].trim();
            }
        }
        
        // Ensure both shaders have proper GLSL version headers
        vertexShader = ensureGlslVersion(vertexShader);
        fragmentShader = ensureGlslVersion(fragmentShader, true);
        
        return { vertexShader, fragmentShader };
    };
    
    // Ensure shader has proper GLSL version and required declarations
    const ensureGlslVersion = (shader, isFragment = false) => {
        // ... [shader version logic - unchanged] ...
        if (!shader) return '';
        
        // Remove any trailing backticks or code fences that might have been missed
        shader = shader.replace(/```.*$/gm, '').trim();
        
        // If shader doesn't start with version directive, add it
        if (!shader.includes('#version')) {
            shader = `#version 300 es
precision mediump float;

${shader}`;
        }
        
        // For fragment shader, ensure it has outColor declaration
        if (isFragment && !shader.includes('out vec4') && !shader.includes('gl_FragColor')) {
            // Insert after precision statement
            const lines = shader.split('\n');
            let insertIndex = 0;
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('precision')) {
                    insertIndex = i + 1;
                    break;
                }
            }
            
            lines.splice(insertIndex, 0, 'out vec4 outColor;');
            shader = lines.join('\n');
            
            // If shader uses gl_FragColor (WebGL 1.0), replace with outColor
            if (shader.includes('gl_FragColor')) {
                shader = shader.replace(/gl_FragColor/g, 'outColor');
            }
        }
        
        // Ensure required uniforms are present
        const requiredUniforms = ['uniform float u_time;', 'uniform vec2 u_resolution;'];
        
        for (const uniform of requiredUniforms) {
            if (!shader.includes(uniform.replace(';', '')) && !shader.includes(uniform)) {
                // Add after precision or version
                const lines = shader.split('\n');
                let insertIndex = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('precision') || lines[i].includes('#version')) {
                        insertIndex = i + 1;
                    }
                }
                
                // Add after all other uniform declarations if they exist
                for (let i = insertIndex; i < lines.length; i++) {
                    if (lines[i].includes('uniform')) {
                        insertIndex = i + 1;
                    } else if (lines[i].includes('void main')) {
                        break;
                    }
                }
                
                lines.splice(insertIndex, 0, uniform);
                shader = lines.join('\n');
            }
        }
        
        return shader;
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
        // Try WebGL 2 first, fall back to WebGL 1 if needed
        let gl = canvas.getContext('webgl2');
        let isWebGL2 = true;
        
        if (!gl) {
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            isWebGL2 = false;
            if (!gl) {
                setRenderError('WebGL is not supported in your browser');
                return;
            }
        }
        
        glRef.current = gl;
        
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
        let { vertexShader, fragmentShader } = parseShaderCode(shaderCode);
        
        // If we couldn't extract the shaders, display an error
        if (!vertexShader || !fragmentShader) {
            setRenderError('Failed to extract valid shader code. Please check your input and try again.');
            return;
        }
        
        // Scan for unsupported matrix uniforms in vertex shader
        const matrixUniformPattern = /uniform\s+mat[234](?:x[234])?\s+(\w+)/g;
        let matrixMatch;
        const matrixUniforms = [];
        
        while ((matrixMatch = matrixUniformPattern.exec(vertexShader)) !== null) {
            matrixUniforms.push(matrixMatch[1]);
        }
        
        // Log detected matrix uniforms for debugging
        if (matrixUniforms.length > 0) {
            console.log("Detected matrix uniforms:", matrixUniforms);
        }
        
        // If we're using WebGL 1, need to adjust the shaders
        if (!isWebGL2) {
            // Replace version and in/out declarations for WebGL 1
            vertexShader = vertexShader
                .replace('#version 300 es', '')
                .replace(/\bin\b/g, 'attribute')
                .replace(/\bout\b/g, 'varying');
                
            fragmentShader = fragmentShader
                .replace('#version 300 es', '')
                .replace(/\bin\b/g, 'varying')
                .replace(/out vec4 outColor;/g, '')
                .replace(/outColor =/g, 'gl_FragColor =');
        }
        
        const vertexShaderSource = vertexShader;
        const fragmentShaderSource = fragmentShader;
        
        console.log("Vertex Shader:", vertexShaderSource);
        console.log("Fragment Shader:", fragmentShaderSource);
        
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
            const mouseLocation = gl.getUniformLocation(shaderProgram, 'u_mouse');
            
            // Track mouse position if the shader uses it
            let mouseX = 0;
            let mouseY = 0;
            
            const trackMouse = (e) => {
                const rect = canvas.getBoundingClientRect();
                mouseX = (e.clientX - rect.left) / canvas.width;
                mouseY = 1.0 - (e.clientY - rect.top) / canvas.height; // Flip Y for WebGL coords
            };
            
            if (mouseLocation) {
                canvas.addEventListener('mousemove', trackMouse);
            }
            
            // Check for other required uniforms that might be in the shader
            const requiredMatrixUniforms = [
                'u_modelViewMatrix',
                'u_projectionMatrix',
                'u_modelViewProjectionMatrix',
                'u_modelMatrix',
                'u_viewMatrix'
            ];
            
            // Create a default identity matrix for any matrix uniforms
            const identityMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
            
            // Set default values for any matrix uniforms that might exist
            requiredMatrixUniforms.forEach(uniformName => {
                const location = gl.getUniformLocation(shaderProgram, uniformName);
                if (location) {
                    console.log(`Found uniform ${uniformName}, setting to identity matrix`);
                    gl.uniformMatrix4fv(location, false, new Float32Array(identityMatrix));
                }
            });
            
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
                
                // Update mouse uniform if it exists
                if (mouseLocation) {
                    gl.uniform2f(mouseLocation, mouseX, mouseY);
                }
                
                // Draw the quad
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                
                animationRef.current = requestAnimationFrame(render);
            };
            
            render();
            


    return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                if (mouseLocation) {
                    canvas.removeEventListener('mousemove', trackMouse);
                }
                window.removeEventListener('resize', resizeCanvas);
            };
            
        } catch (err) {
            console.error("Shader error:", err);
            setRenderError(`Shader error: ${err.message}`);
            
            // Try to provide more helpful error context
            const lines = err.message.match(/ERROR: \d+:(\d+):/);
            if (lines && lines[1]) {
                const lineNum = parseInt(lines[1], 10);
                const shaderType = err.message.includes("Fragment") ? "fragment" : "vertex";
                const shaderSource = shaderType === "fragment" ? fragmentShaderSource : vertexShaderSource;
                const shaderLines = shaderSource.split('\n');
                
                let errorContext = "";
                for (let i = Math.max(0, lineNum - 3); i < Math.min(shaderLines.length, lineNum + 2); i++) {
                    errorContext += `${i + 1}: ${shaderLines[i]}\n`;
                    if (i + 1 === lineNum) {
                        errorContext += "   ^^^ ERROR HERE ^^^\n";
                    }
                }
                
                console.error("Error context:\n", errorContext);
                setRenderError(`${err.message}\n\nContext:\n${errorContext}`);
            }
            
            return () => {
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, [shaderCode]);

    // Default shader code for first render
    useEffect(() => {
        if (!shaderCode) {
            setShaderCode(`// Vertex Shader
#version 300 es
precision mediump float;

in vec4 a_position;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  gl_Position = a_position;  // DO NOT CHANGE THIS LINE
}

// Fragment Shader
#version 300 es
precision mediump float;

out vec4 outColor;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  vec3 color = vec3(0.0);
  
  // Gradient background
  color = vec3(st.x, st.y, 1.0 - st.y);
  
  // Simulate a rotating cube effect
  float angle = u_time;
  float c = cos(angle);
  float s = sin(angle);
  
  // Center the coordinates
  vec2 center = st - 0.5;
  
  // Rotate the coordinates
  vec2 rotated = vec2(
    center.x * c - center.y * s,
    center.x * s + center.y * c
  );
  
  // Define a simple cube-like shape
  float cubeSize = 0.2;
  if (abs(rotated.x) < cubeSize && abs(rotated.y) < cubeSize) {
    color = vec3(1.0, 0.5, 0.0); // Orange color for the cube
  }
  
  outColor = vec4(color, 1.0);
}`);
        }
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-xl shadow-xl mt-6 border border-gray-800">
            {/* Sample Prompts Section */}
            <div className="mb-6">
                <div className="text-indigo-400 font-mono text-sm mb-2">Sample Prompts:</div>
                <div className="flex flex-wrap gap-2">
                    {samplePrompts.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => setInput(prompt)}
                        className={`py-1.5 px-3 rounded-full text-sm font-mono transition-colors duration-200 text-indigo-100 ${
                        input === prompt 
                            ? 'bg-indigo-600 hover:bg-indigo-700 border-transparent' 
                            : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                        }`}
                    >
                        {prompt.length > 25 ? prompt.substring(0, 25) + "..." : prompt}
                    </button>
                    ))}
                </div>
            </div>

            {/* Text Input Section */}
            <div className="mb-4">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-gray-950 text-indigo-100 font-mono p-4 rounded border border-gray-800 focus:border-indigo-500 focus:outline-none resize-none h-24"
                    placeholder="Describe the shader you want to generate..."
                    style={{ caretColor: '#8B5CF6' }}
                />
            </div>
            
            {/* Generate Button */}
            <div className="mb-6">
                <button
                    onClick={generateShader}
                    disabled={loading || !input.trim()}
                    className={`px-6 py-2 rounded-md font-mono flex items-center justify-center transition-all duration-200 max-w-xs mx-auto ${
                        loading || !input.trim() 
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                    {loading ? (
                        <>
                            <div className="flex items-center">
                                <div className="w-4 h-4 border-2 border-indigo-100 border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span>Generating...</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Run Shader
                        </>
                    )}
                </button>
            </div>
            
            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-900/30 border-l-4 border-red-600 rounded-md overflow-hidden">
                    <div className="flex items-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-red-200 font-mono">
                            {error}
                        </div>
                    </div>
                </div>
            )}
            
            {/* WebGL Render Error with Retry Button */}
            {renderError && (
                <div className="mb-6 bg-yellow-900/30 border-l-4 border-yellow-600 rounded-md overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-yellow-300 font-mono">Shader Compilation Error</span>
                            </div>
                            <button 
                                onClick={correctShader}
                                disabled={loading}
                                className={`text-sm ${loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} px-3 py-1 rounded font-mono transition-colors duration-200 flex items-center`}
                            >
                                {loading && retrying ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-indigo-100 border-t-transparent rounded-full animate-spin mr-2"></div>
                                        <span>Retrying...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Retry
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-yellow-200 font-mono pl-9">{renderError}</pre>
                    </div>
                </div>
            )}
            
                            {/* Preview and Code Sections (shown when shader code exists) */}
            {shaderCode && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Shader Preview */}
                    <div className="bg-gray-950 rounded-lg border border-gray-800 shadow-lg overflow-hidden">
                        <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
                            <span className="text-indigo-300 font-mono text-sm">Shader Preview</span>
                            <div className="flex space-x-2">
                                <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded font-mono">WebGL</span>
                                <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded font-mono">Live</span>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <canvas 
                                ref={canvasRef}
                                className="w-full h-64"
                            />
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 py-1 bg-black/50 text-gray-300 text-xs font-mono">
                                <span>Mode: <span className="text-green-400">Real-time</span></span>
                                <span>Resolution: <span className="text-indigo-400">Canvas</span></span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Shader Code Output */}
                    <div className="bg-gray-950 rounded-lg border border-gray-800 shadow-lg overflow-hidden">
                        <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
                            <span className="text-indigo-300 font-mono text-sm">Generated Code</span>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={copyToClipboard}
                                    className={`text-xs ${copied ? 'bg-green-700 text-green-100' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} px-2 py-0.5 rounded font-mono transition-colors duration-200 flex items-center`}
                                >
                                    {copied ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : 'Copy'}
                                </button>
                                <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded font-mono">GLSL</span>
                            </div>
                        </div>
                        
                        <div className="h-64 overflow-auto">
                            <SyntaxHighlighter 
                                language="glsl" 
                                style={vscDarkPlus}
                                customStyle={{
                                    margin: 0,
                                    padding: '1rem',
                                    background: 'transparent',
                                    fontSize: '0.875rem',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                                }}
                            >
                                {shaderCode}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shader;