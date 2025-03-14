import React from 'react';
import { createRoot } from 'react-dom/client';
import DebuggerPopup from './components/DebuggerPopup';
import './styles.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<DebuggerPopup />);