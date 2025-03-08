import React, { useState, useEffect } from 'react';
import { Calculator, Code, Terminal, ChevronRight } from 'lucide-react';

const Header = () => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [hovering, setHovering] = useState(false);

  return (
    <div className="w-full relative">
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg p-6">
        <div className="max-w-6xl mx-auto">
          <div 
            className="flex items-center justify-center"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Atom logo with orbiting electrons */}
                <div className="relative w-full h-full">
                  {/* Nucleus - fixed positioning */}
                  <div 
                    className="absolute w-4 h-4 bg-indigo-500 rounded-full z-10"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: hovering ? 'translate(-50%, -50%) scale(1.1)' : 'translate(-50%, -50%) scale(1)',
                      boxShadow: hovering ? '0 0 8px rgba(99, 102, 241, 0.8)' : '0 0 0 rgba(99, 102, 241, 0)',
                      transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full"></div>
                  </div>
                  
                  {/* Orbiting electrons */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      animation: 'orbit1 3s linear infinite',
                      border: '1px solid rgba(129, 140, 248, 0.3)',
                      transform: 'rotate(30deg)',
                    }}
                  >
                    <div 
                      className="absolute w-2 h-2 bg-blue-400 rounded-full"
                      style={{
                        top: '0%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 4px rgba(96, 165, 250, 0.8)',
                        animation: hovering ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      }}
                    ></div>
                  </div>
                  
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      animation: 'orbit2 4s linear infinite',
                      border: '1px solid rgba(129, 140, 248, 0.3)',
                      transform: 'rotate(75deg)',
                    }}
                  >
                    <div 
                      className="absolute w-2 h-2 bg-indigo-400 rounded-full"
                      style={{
                        bottom: '0%',
                        left: '50%',
                        transform: 'translate(-50%, 50%)',
                        boxShadow: '0 0 4px rgba(129, 140, 248, 0.8)',
                        animation: hovering ? 'pulse 2s ease-in-out infinite' : 'none',
                      }}
                    ></div>
                  </div>
                  
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      animation: 'orbit3 5s linear infinite',
                      border: '1px solid rgba(129, 140, 248, 0.3)',
                      transform: 'rotate(120deg)',
                    }}
                  >
                    <div 
                      className="absolute w-2 h-2 bg-purple-400 rounded-full"
                      style={{
                        top: '50%',
                        right: '0%',
                        transform: 'translate(50%, -50%)',
                        boxShadow: '0 0 4px rgba(167, 139, 250, 0.8)',
                        animation: hovering ? 'pulse 2.5s ease-in-out infinite' : 'none',
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Add keyframes for animations */}
                <style jsx>{`
                  @keyframes orbit1 {
                    0% { transform: rotate(30deg); }
                    100% { transform: rotate(390deg); }
                  }
                  @keyframes orbit2 {
                    0% { transform: rotate(75deg); }
                    100% { transform: rotate(435deg); }
                  }
                  @keyframes orbit3 {
                    0% { transform: rotate(120deg); }
                    100% { transform: rotate(480deg); }
                  }
                  @keyframes pulse {
                    0% { opacity: 0.7; }
                    50% { opacity: 1; }
                    100% { opacity: 0.7; }
                  }
                `}</style>
              </div>
              <h1 
                className="text-3xl font-mono font-bold text-white tracking-tight"
                style={{
                  textShadow: hovering ? '0 0 8px rgba(99, 102, 241, 0.6)' : 'none',
                  transition: 'text-shadow 0.3s ease-in-out'
                }}
              >
                tiny<span className="text-indigo-400">calc</span>
              </h1>
            </div>
          </div>
          
          {/* Mode Selection Tabs */}
          <div className="mt-8 pt-2 border-t border-gray-700 flex flex-col items-center">
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'calculator'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Calculator size={16} className="mr-2" />
                <span>Calculator</span>
                {activeTab === 'calculator' && (
                  <ChevronRight size={16} className="ml-1 animate-pulse" />
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('shader')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'shader'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Code size={16} className="mr-2" />
                <span>Text-to-Shader</span>
                {activeTab === 'shader' && (
                  <ChevronRight size={16} className="ml-1 animate-pulse" />
                )}
              </button>
            </div>
            
            <div className="mt-4 px-1 text-gray-400 text-sm text-center">
              {activeTab === 'calculator' ? (
                <div className="flex items-center justify-center">
                  <span className="text-indigo-400 font-mono">Rust-powered</span>
                  <span className="mx-2">•</span>
                  <span>Fast calculations on the frontend</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-indigo-400 font-mono">WebGL magic</span>
                  <span className="mx-2">•</span>
                  <span>Turn text into beautiful shaders</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;