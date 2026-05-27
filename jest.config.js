module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'jest-expo',
      setupFiles: ['<rootDir>/jest.setup.ws.js'],
      testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@supabase/.*|react-native-url-polyfill))',
      ],
      moduleNameMapper: {
        '@react-native-async-storage/async-storage':
          '@react-native-async-storage/async-storage/jest/async-storage-mock',
        '^@/lib/supabase$': '<rootDir>/src/lib/__mocks__/supabase.ts',
      },
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/jest.setup.ws.js'],
      testMatch: ['**/tests/integration/**/*.test.ts'],
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@supabase/.*|react-native-url-polyfill))',
      ],
    },
  ],
};
