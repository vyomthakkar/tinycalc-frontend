import React, { useState } from 'react'
import Calculator from './components/Calculator'
import Header from './components/Header'
import Shader from './components/Shader'
function App() {
  const [activeTab, setActiveTab] = useState('calculator');
  return (
    <div className="app bg-gray-950 min-h-screen">
      <header>
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      </header>
      <main className='container mx-auto py-8'>
        {activeTab === 'calculator' && <Calculator />}
        {activeTab === 'shader' && <Shader />}
      </main>
      <footer>
      </footer>
    </div>
  )
}

export default App