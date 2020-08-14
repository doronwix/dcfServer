const fs = require("./fileserver"); //fileserver
const db = require("./db"); //fileserver
let repository = {};

module.exports.create = (fileName, json_result) => {
  repository.create(fileName, json_result);
};

module.exports.get = (fileName) => {
  return repository.get(fileName);
};

module.exports.isExists = (path, fileName, extraData = {}) => {
  return repository.isExists(path, fileName, extraData);
};

module.exports.registerRepositry = (type) => {
  if (type === "fs") {
    repository = fs;
  } else if (type === "db") {
    repository = db;
  }
};
