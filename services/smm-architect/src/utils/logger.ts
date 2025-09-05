export const logger = {
  info: (...args: any[]): void => {
    console.log(...args);
  },
  error: (...args: any[]): void => {
    console.error(...args);
  }
};
