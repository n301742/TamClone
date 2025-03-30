/**
 * Mock implementation of bcrypt for testing
 */
export default {
  genSalt: jest.fn().mockResolvedValue('mocksalt'),
  hash: jest.fn().mockImplementation((password, salt) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn().mockImplementation((plainPassword, hashedPassword) => 
    Promise.resolve(hashedPassword === `hashed_${plainPassword}` || hashedPassword === plainPassword)
  )
}; 