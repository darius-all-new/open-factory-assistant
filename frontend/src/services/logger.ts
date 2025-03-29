// Logger service for frontend application
import axios from 'axios';
import { API_URL } from '../config/api';

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 1000;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly logEndpoint = `${API_URL}/logs/frontend`;
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {
    // Start periodic flush
    this.scheduleFlush();
    // Flush on page unload
    window.addEventListener('unload', () => this.flush());
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };
  }

  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToSend = [...this.logBuffer];
      this.logBuffer = [];

      const token = sessionStorage.getItem('token');
      
      // Send logs to backend
      await axios.post(
        this.logEndpoint,
        { logs: logsToSend },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );
    } catch (error) {
      // In development, show the error in console
      if (this.isDevelopment) {
        console.error('Failed to send logs to server:', error);
      }
      
      // Keep the logs in buffer if send fails
      this.logBuffer = [...this.logBuffer];
      if (this.logBuffer.length > this.maxBufferSize) {
        // If buffer is full, remove oldest entries
        this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
      }
    }

    this.scheduleFlush();
  }

  error(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context);
    if (this.isDevelopment) {
      console.error(message, context);
    }
    this.addToBuffer(entry);
  }

  warn(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    if (this.isDevelopment) {
      console.warn(message, context);
    }
    this.addToBuffer(entry);
  }

  info(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    if (this.isDevelopment) {
      console.info(message, context);
    }
    this.addToBuffer(entry);
  }

  debug(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    if (this.isDevelopment) {
      console.debug(message, context);
    }
    this.addToBuffer(entry);
  }

  // For development/debugging
  getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  // For development/debugging
  downloadCurrentLogs() {
    const logsBlob = new Blob([JSON.stringify(this.logBuffer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(logsBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontend_logs_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const logger = Logger.getInstance();
