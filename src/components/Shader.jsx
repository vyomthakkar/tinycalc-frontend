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

    // Enhanced shader parser that handles different formats and strips markdown
    const parseShaderCode = (code) => {
        if (!code) return { vertexShader: '', fragmentShader: '' };
        
        // First, strip any markdown code fences
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
        
        // If we still couldn't extract the shaders, use defaults
        const vertexShaderSource = vertexShader || `${isWebGL2 ? '#version 300 es' : ''}
precision mediump float;

${isWebGL2 ? 'in' : 'attribute'} vec4 a_position;

void main() {
    gl_Position = a_position;
}`;
        
        const fragmentShaderSource = fragmentShader || `${isWebGL2 ? '#version 300 es' : ''}
precision mediump float;

${isWebGL2 ? 'out vec4 outColor;' : ''}
uniform float u_time;

void main() {
    float pulse = abs(sin(u_time));
    ${isWebGL2 ? 'outColor' : 'gl_FragColor'} = vec4(pulse, 0.0, 0.0, 1.0);
}`;
        
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
            
            // Additional cleanup
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
    gl_Position = a_position;
}

// Fragment Shader
#version 300 es
precision mediump float;

out vec4 outColor;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    // Simple color pulse effect
    float pulse = abs(sin(u_time));
    
    // Create a gradient based on position
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), st.x);
    
    // Apply the pulse effect
    color = color * pulse;
    
    outColor = vec4(color, 1.0);
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
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{renderError}</pre>
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