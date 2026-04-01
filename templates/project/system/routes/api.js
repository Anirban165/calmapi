/* eslint-disable no-console */
'use strict';
const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const pluralize = require('pluralize');
const { CalmResponse } = require('../core/CalmResponse');
const { printModuleTable } = require('../utils/cli');

pluralize.addUncountableRule('media');
pluralize.addUncountableRule('auth');

const modulesPath = path.resolve(`${__dirname}/../../src/modules`);
const PATHS = fs.readdirSync(modulesPath);
const moduleMapper = [];
let tableWidth = 40;

const buildPath = (base, segment) => (base ? `${base}/${segment}` : segment);

const loadModules = (basePath, baseRoute, routerPaths) => {
  routerPaths.forEach(mod => {
    if (mod === 'index.js') {
      return;
    }

    const moduleRoute = `${mod}.route.js`;
    const moduleSettings = `${mod}.settings.js`;
    let urlPath;

    try {
      const settings = require(path.resolve(modulesPath, buildPath(basePath, mod), moduleSettings));
      if (settings.moduleRoute) {
        urlPath = settings.moduleRoute;
      }
    } catch {
      /* no custom settings */
    }

    const route = `/${buildPath(baseRoute, urlPath || pluralize.plural(mod))}`;

    try {
      router.use(route, require(path.resolve(modulesPath, buildPath(basePath, mod), moduleRoute)));
      moduleMapper.push({ Module: mod, Route: route, Mapped: '✔', Exposed: '✔' });
    } catch (e) {
      if (e.message.includes('Router.use() requires')) {
        moduleMapper.push({ Module: mod, Route: '-', Mapped: '-', Exposed: '✘' });
        return;
      }

      const modDir = path.resolve(modulesPath, buildPath(basePath, mod));
      const subPaths = fs
        .readdirSync(modDir)
        .filter(p => fs.lstatSync(path.resolve(modDir, p)).isDirectory());

      if (!subPaths.length) {
        moduleMapper.push({
          Module: mod,
          Route: route,
          Mapped: '✘',
          Exposed: '✔',
          Error: `${e.message.substring(0, 25)}..`
        });
      } else {
        loadModules(
          buildPath(basePath, mod),
          buildPath(baseRoute, urlPath || pluralize.plural(mod)),
          subPaths
        );
      }
    }
  });
};

router.use((req, res, next) => {
  res.sendCalmResponse = CalmResponse.bind(res);
  next();
});

loadModules('', '', PATHS);
tableWidth = printModuleTable(moduleMapper);

router.get('/', (req, res) => {
  res.sendCalmResponse({ message: 'API Running' });
});

module.exports = { apiRoutes: router, tableWidth };
