// This file contains global type declarations

// Declare Jest globals
declare global {
  const describe: (name: string, fn: () => void) => void;
  const it: (name: string, fn: () => void) => void;
  const test: (name: string, fn: () => void) => void;
  const expect: any;
  const beforeEach: (fn: () => void) => void;
  const afterEach: (fn: () => void) => void;
  const beforeAll: (fn: () => void) => void;
  const afterAll: (fn: () => void) => void;
  
  namespace jest {
    function fn(): any;
    function mock(moduleName: string, factory?: any): any;
    function clearAllMocks(): void;
    
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mockReturnThis(): Mock<T, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockResolvedValue(value: T): Mock<T, Y>;
      mockRejectedValue(value: any): Mock<T, Y>;
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockReturnValueOnce(value: T): Mock<T, Y>;
      mockResolvedValueOnce(value: T): Mock<T, Y>;
      mockRejectedValueOnce(value: any): Mock<T, Y>;
      mockImplementationOnce(fn: (...args: Y) => T): Mock<T, Y>;
    }
  }
} 