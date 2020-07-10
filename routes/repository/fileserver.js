const fs = require("fs"); //filesystem
module.exports.create = (fileName, json_result) => {
  const file = fs.createWriteStream("./fs/" + fileName);
  file.write(JSON.stringify(json_result));
  file.end();
};

module.exports.get = (fileName) => {
  return fs.readFileSync("./fs/" + fileName, "utf8");
};

module.exports.isExists = (path, fileName) => {
  return isFile(path, fileName);
};

function isFile(path, fileName) {
  return new Promise((resolve, reject) => {
    fs.stat(path + fileName, (err, result) => {
      if (err === null) {
        result = { size: result.size, name: fileName };
        resolve(result);
      } else if (err.code == "ENOENT") {
        // file does not exist
        result = { size: 0, mtime: Date.now() };
        reject(result);
      } else {
        result = { size: 0, mtime: Date.now(), error: err.code };
        reject(result);
      }
    });
  });
}
