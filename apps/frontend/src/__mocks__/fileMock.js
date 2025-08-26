module.exports = {
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/src/__mocks__/fileMock.js',
  '\\.(woff|woff2|eot|ttf|otf)$': '<rootDir>/src/__mocks__/fileMock.js',
}