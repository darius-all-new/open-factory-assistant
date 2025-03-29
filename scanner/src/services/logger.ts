// Logger service for scanner application
import axios from 'axios';
import { auth } from './auth';

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
  private readonly flushInterval = 2000; // 2 seconds
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly logEndpoint = `${import.meta.env.VITE_API_URL}/logs/scanner`;
  private readonly isDevelopment = import.meta.env.MODE === 'development';

  private constructor() {
    // Start periodic flush
    this.scheduleFlush();
    // Flush on page unload and visibility change
    window.addEventListener('unload', () => this.flush());
    document.addEventListener('visibilitychange', () => this.flush());
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
    // Flush immediately for real-time logging
    this.flush();
  }

  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
  }

  private async flush() {
    if (this.logBuffer.length === 0) {
      this.scheduleFlush();
      return;
    }

    try {
      const logsToSend = [...this.logBuffer];
      this.logBuffer = [];

      const token = auth.getToken();
      
      const response = await axios.post(
        this.logEndpoint,
        { logs: logsToSend },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          withCredentials: true
        }
      );

      if (this.isDevelopment && response.status !== 200) {
        console.warn('Log flush failed:', response.status);
      }
    } catch (error: any) {
      if (this.isDevelopment) {
        console.error('Failed to send logs:', {
          error: error.message,
          status: error.response?.status
        });
      }
      
      // Keep the logs in buffer if send fails
      this.logBuffer = this.logBuffer;
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
}

export const logger = Logger.getInstance();
