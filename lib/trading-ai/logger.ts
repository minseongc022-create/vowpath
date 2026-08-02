/**
 * Logger Utility
 * Centralized logging for the trading bot
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, module: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      module,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]`;
    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;

    switch (level) {
      case 'debug':
        console.debug(prefix, logMessage);
        break;
      case 'info':
        console.info(prefix, logMessage);
        break;
      case 'warn':
        console.warn(prefix, logMessage);
        break;
      case 'error':
        console.error(prefix, logMessage);
        break;
    }
  }

  debug(module: string, message: string, data?: any): void {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: any): void {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, data?: any): void {
    this.log('error', module, message, data);
  }

  getLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }
    return filtered.slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
