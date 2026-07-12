/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'logic-to-render',
      comment: '逻辑层不得依赖渲染层',
      from: { path: '^src/logic' },
      to: { path: 'src/render' },
    },
    {
      name: 'logic-to-pixi',
      comment: '逻辑层不得依赖 PixiJS',
      from: { path: '^src/logic' },
      to: { path: 'node_modules/pixi\\.js' },
    },
    {
      name: 'logic-to-react',
      comment: '逻辑层不得依赖 React',
      from: { path: '^src/logic' },
      to: { path: 'node_modules/react/' },
    },
    {
      name: 'logic-to-react-dom',
      comment: '逻辑层不得依赖 react-dom',
      from: { path: '^src/logic' },
      to: { path: 'node_modules/react-dom/' },
    },
  ],
};
