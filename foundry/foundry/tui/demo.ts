#!/usr/bin/env node
import { render } from 'ink';
import App from './app.js';

// Demo entry point
render(App({ demoMode: true }));
