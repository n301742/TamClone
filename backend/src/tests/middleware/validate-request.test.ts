import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';

describe('validateRequest middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should call next() when validation passes', async () => {
    // Create a schema that validates all request parts
    const schema = z.object({
      body: z.object({
        name: z.string().min(3),
        email: z.string().email(),
      }),
      query: z.object({
        page: z.string().optional(),
      }),
      params: z.object({
        id: z.string().optional(),
      }),
    });
    
    // Set up valid request data
    mockRequest.body = { 
      name: 'Test User', 
      email: 'test@example.com' 
    };
    mockRequest.query = { page: '1' };
    mockRequest.params = { id: '123' };

    const middleware = validateRequest(schema);
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Verify next was called without errors
    expect(nextFunction).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
    
    // Verify response methods were not called
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should return 400 with error details when body validation fails', async () => {
    // Create a schema with body validation
    const schema = z.object({
      body: z.object({
        name: z.string().min(3),
        email: z.string().email(),
      }),
      query: z.object({}).optional(),
      params: z.object({}).optional(),
    });
    
    // Set up invalid body data
    mockRequest.body = { 
      name: 'A', // Too short
      email: 'not-an-email' // Invalid email
    };

    const middleware = validateRequest(schema);
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Verify response with validation errors
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'body.name',
            message: expect.stringContaining('at least 3 character'),
          }),
          expect.objectContaining({
            path: 'body.email',
            message: expect.stringContaining('Invalid email'),
          }),
        ]),
      })
    );
    
    // Verify next was not called
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 with error details when query validation fails', async () => {
    // Create a schema with query validation
    const schema = z.object({
      body: z.object({}).optional(),
      query: z.object({
        page: z.number(),
        limit: z.number().min(1).max(100),
      }),
      params: z.object({}).optional(),
    });
    
    // Set up invalid query data
    mockRequest.query = { 
      page: 'abc', // Not a number
      limit: '200' // Exceeds max
    };

    const middleware = validateRequest(schema);
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Verify response with validation errors
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'query.page',
            message: expect.stringContaining('Expected number'),
          }),
          expect.objectContaining({
            path: 'query.limit',
            message: expect.stringContaining('Expected number'),
          }),
        ]),
      })
    );
    
    // Verify next was not called
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should pass non-zod errors to next middleware', async () => {
    // Create a mock schema that throws a non-zod error when parsed
    const mockParseAsync = jest.fn().mockImplementation(() => {
      throw new Error('Non-zod error');
    });
    
    const schema = z.object({
      body: z.object({}),
      query: z.object({}),
      params: z.object({}),
    });
    
    // Override the parseAsync method
    schema.parseAsync = mockParseAsync;
    
    const middleware = validateRequest(schema);
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Verify next was called with the error
    expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
}); 