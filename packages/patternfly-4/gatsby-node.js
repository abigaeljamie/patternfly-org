/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

const path = require('path');
const fs = require('fs-extra');
const paramCase = require('param-case');
const glob = require('glob');
const ChildProcess = require('child_process');

// Map to handlebars partial files for Core
let partialsToLocationsMap = null;

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;
  const reactComponentPathRegEx = /\/documentation\/react\/.*(components|layouts|demos)\//;
  const coreComponentPathRegEx = /\/documentation\/core\/.*(components|layouts|demos|upgrade-examples|utilities)\//;
  const isSitePage = node.internal.type === 'SitePage';
  if (isSitePage) {
    if (reactComponentPathRegEx.test(node.path)) {
      const reactPathLabel = node.component
        .split('/')
        .pop()
        .split('.')
        .shift()
        .replace(/([A-Z])/g, ' $1');

      createNodeField({
        node,
        name: 'label',
        value: reactPathLabel
      });
    } else if (coreComponentPathRegEx.test(node.path)) {
      const corePathLabel = node.component
        .split('/')
        .slice(-3)[0]
        .replace(/([A-Z])/g, ' $1');

      createNodeField({
        node,
        name: 'label',
        value: corePathLabel
      });
      createNodeField({
        node,
        name: 'type',
        value: node.path.split('/')[3]
      });
    }
  }
};

exports.createPages = ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;
  const redirects = [
    { f: '/get-started', t: '/get-started/about' },
    { f: '/design-guidelines', t: '/design-guidelines/styles/icons' },
    { f: '/design-guidelines/styles', t: '/design-guidelines/styles/icons'},
    { f: '/community', t: '/community/contribute/designers' },
    { f: '/documentation', t: '/documentation/react/components/aboutmodal' },
    { f: '/documentation/react/components', t: '/documentation/react/components/aboutmodal'},
    { f: '/documentation/react/layouts', t: '/documentation/react/layouts/bullseye'},
    { f: '/documentation/react/demos', t: '/documentation/react/demos/pagelayout'}
  ];
  redirects.forEach(({ f, t }) => {
    createRedirect({
      fromPath: f,
      redirectInBrowser: true,
      toPath: t
    })
    console.log('\nRedirecting: ' + f + ' to: ' + t);
  })
  const markdownPageTemplate = path.resolve('src/templates/markdownPageTemplate.js')
  return new Promise((resolve, reject) => {
    graphql(`
      fragment DocFile on File {
        relativePath
        relativeDirectory
        absolutePath
        base
        name
      }
      query AllDocsFiles {
        docs: allFile(filter: { sourceInstanceName: { eq: "react" }, absolutePath: { glob: "**/*.docs.js" } }) {
          edges {
            node {
              ...DocFile
            }
          }
        }
        examples: allFile(filter: { sourceInstanceName: { eq: "react" }, absolutePath: { glob: "**/examples/!(*.styles).js" } }) {
          edges {
            node {
              ...DocFile
            }
          }
        }
        exampleImages: allFile(filter: { sourceInstanceName: { eq: "react" }, extension: { regex: "/(png|svg|jpg)/" } }) {
          edges {
            node {
              ...DocFile
            }
          }
        }
        coreExamples: allFile(filter: { sourceInstanceName: { eq: "core" }, absolutePath: { glob: "**/examples/index.js" } }) {
          edges {
            node {
              ...DocFile
            }
          }
        }
        markdownPages: allMarkdownRemark(filter: {fileAbsolutePath: {glob: "**/patternfly-4/content/**"}, frontmatter: {path: {ne: null}}}) {
          edges {
            node {
              fileAbsolutePath
              frontmatter {
                path
              }
            }
          }
        }
      }
    `).then(result => {
      if (result.errors) {
        return reject(result.errors);
      }
      const { docs, examples, exampleImages, coreExamples, markdownPages} = result.data;
      const docExports = [];
      const docsComponentPath = path.resolve(__dirname, './src/components/_react/Documentation');
      docs.edges.forEach(({ node: doc }) => {
        const filePath = path.resolve(__dirname, '.tmp', doc.base);

        const rawExamples = [];
        const getPackage = pkg => doc.absolutePath.indexOf(pkg) !== -1 && pkg;
        const packageDir = getPackage('react-core') || getPackage('react-charts') || getPackage('react-table');
        examples.edges.forEach(({ node: example }) => {
          if (
            example.relativeDirectory
              .split('/')
              .slice(0, 3)
              .join('/') === doc.relativeDirectory
          ) {
            const examplePath = `../_repos/${packageDir}/${example.relativePath}`;
            rawExamples.push(`{name: '${example.name}', path: '${examplePath}', file: require('!!raw-loader!${examplePath}')}`);
          }
        });
        const allImages = [];
        exampleImages.edges.forEach(({ node: image }) => {
          const imagePath = `../_repos/react-core/${image.relativePath}`;
          allImages.push(`{name: '${image.base}', file: require('${imagePath}')}`);
        });

        const content = `
        import React from 'react';
        import docs from '${doc.absolutePath}';
        import Documentation from '${docsComponentPath}';

        const rawExamples = [${rawExamples}];
        const images = [${allImages}];

        export const ${doc.base.split('.')[0].toLowerCase()}_docs = docs;
        export const ${doc.base.split('.')[0].toLowerCase()}_package = '${packageDir}';

        export default () => <Documentation rawExamples={rawExamples} images={images} {...docs} />;
        `;

        docExports.push(
          `export { ${doc.base.split('.')[0].toLowerCase()}_docs, ${doc.base
            .split('.')[0]
            .toLowerCase()}_package } from './${doc.base}';`
        );

        fs.outputFileSync(filePath, content);
        const shortenedPath = doc.relativePath.split('/').slice(1).join('/');
        console.log(`creating page for: /documentation/react/${path.dirname(shortenedPath).toLowerCase()}`);
        createPage({
          path: `/documentation/react/${path.dirname(shortenedPath).toLowerCase()}`,
          component: filePath
        });
      });

      const indexFilePath = path.resolve(__dirname, '.tmp', 'index.js');
      fs.writeFileSync(indexFilePath, docExports.join('\n'));

      examples.edges.forEach(({ node: example }) => {
        const shortenedPath = example.relativePath.split('/').slice(1).join('/');
        const examplePath = `/documentation/react/${path.dirname(shortenedPath).toLowerCase()}/${paramCase(example.name)}`;
        console.log(`creating page for: ${examplePath}`);
        createPage({
          path: examplePath,
          layout: 'example',
          component: example.absolutePath
        });
      });

      coreExamples && coreExamples.edges.forEach(({ node }) => {
        const shortenedPath = node.relativePath.split('/').slice(2, 4).join('/').toLowerCase();
        const examplePath = `/documentation/core/${shortenedPath}`;

        console.log(`creating page for: ${examplePath}`);
        createPage({
          path: examplePath,
          component: path.resolve(__dirname, node.absolutePath)
        });
        // also create a full demo page for each component
        console.log(`creating page for: ${examplePath}-full`);
        createPage({
          path: `${examplePath}-full`,
          component: path.resolve(__dirname, node.absolutePath)
        });
      });

      markdownPages.edges.forEach(({ node }) => {
        console.log(`creating page for: ${node.frontmatter.path}`);
        createPage({
          path: node.frontmatter.path,
          component: markdownPageTemplate,
          context: {}, // additional data can be passed via context
        })
      });
      resolve();
    });
  })
};

exports.onCreateWebpackConfig = ({ stage, loaders, actions, plugins, getConfig }) =>
  new Promise((resolve, reject) => {
    if (partialsToLocationsMap === null) {
      partialsToLocationsMap = {};
      glob(path.resolve(__dirname, './_repos/core/src/patternfly/**/*.hbs'), { ignore: '**/examples/**' }, (err, files) => {
        files.forEach(file => {
          const fileNameArr = file.split('/');
          const fileName = fileNameArr[fileNameArr.length - 1].slice(0, -4);
          partialsToLocationsMap[fileName] = file;
        });
        continueWebpackConfig({ stage, loaders, actions, plugins, getConfig });
        resolve();
      });
    } else {
      continueWebpackConfig({ stage, loaders, actions, plugins, getConfig });
      resolve();
    }
});

const continueWebpackConfig = ({ stage, loaders, actions, plugins, getConfig }) => {
  const pfStylesTest = /patternfly.*(components|layouts|utilities).*\.css$/;
  actions.setWebpackConfig({
    module: {
      rules: [
        {
          test: /\.md$/,
          loader: 'html-loader!markdown-loader'
        },
        {
          test: /\.hbs$/,
          query: {
            extensions: '.hbs',
            partialResolver(partial, callback) {
              if (partialsToLocationsMap[partial]) {
                callback(null, partialsToLocationsMap[partial]);
              } else {
                callback(new Error(`Could not find partial: ${partial}`), '');
              }
            },
            helperDirs: path.resolve(__dirname, './_repos/core/build/helpers')
          },
          loader: 'handlebars-loader'
        }
      ]
    },
    resolve: {
      alias: {
        '@siteComponents': path.resolve(__dirname, './src/components/_core'),
        '@components': path.resolve(__dirname, './_repos/core/src/patternfly/components'),
        '@layouts': path.resolve(__dirname, './_repos/core/src/patternfly/layouts'),
        '@demos': path.resolve(__dirname, './_repos/core/src/patternfly/demos'),
        '@project': path.resolve(__dirname, './_repos/core/src'),
        '@content': path.resolve(__dirname, './src/components/content')
      }
    },
    resolveLoader: {
      alias: { raw: 'raw-loader' }
    }
  });

  if (stage === `build-javascript`) {
    let config = getConfig();
    config.optimization = {
      runtimeChunk: {
        name: `webpack-runtime`,
      },
      splitChunks: {
        name: false,
        cacheGroups: {
          styles: {
            name: `styles`,
            // This should cover all our types of CSS.
            test: /\.(css|scss|sass|less|styl)$/,
            chunks: `all`,
            enforce: true,
          },
        },
      },
      minimizer: [
        plugins.minifyJs({
          terserOptions: {
            keep_fnames: true
          }
        }),
        plugins.minifyCss(),
      ].filter(Boolean),
    }
    actions.replaceWebpackConfig(config);
  }
};

exports.onPostBuild = () => {
  ChildProcess.execSync("ps aux | grep jest | grep -v grep | awk '{print $2}' | xargs kill");
};
