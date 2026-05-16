import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
    if (name === 'd' && String(value).includes('undefined')) {
        let domPath = '';
        let curr = this;
        for (let i = 0; i < 5 && curr; i++) {
            domPath += curr.nodeName + (curr.id ? '#' + curr.id : '') + ' < ';
            curr = curr.parentNode;
        }
        console.error('TRACER DOM PATH:', domPath);
        try { console.error('TRACER OUTERHTML:', this.outerHTML); } catch(e) {}
    }
    originalSetAttribute.call(this, name, value);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
