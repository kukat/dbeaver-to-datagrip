const crypto = require("crypto");
const fs = require("fs");
const zipper = require("zip-local");

const dbeaverConfigPath = "./.dbeaver"
const datasource = require(`${dbeaverConfigPath}/data-sources.json`)

const driverAdapter = (provider, driver) => {
  const isAzureSqlServer = (provider === "sqlserver" && driver === "azure");

  return [
    isAzureSqlServer ? "azure.ms" : "postgresql",
    isAzureSqlServer ? "com.microsoft.sqlserver.jdbc.SQLServerDriver" : "org.postgresql.Driver"
  ];
};

const replaceTemplate = (datasourcesXml) => {
  const template = "./dataSources.xml"
  const dest = "./datagrip-settings/options/dataSources.xml"
  fs.readFile(template, 'utf8', function(err, data) {
    if (err) {
      return console.error(err);
    }
    var result = data.replace(/\{\{datasources\}\}/g, datasourcesXml);

    fs.writeFile(dest, result, 'utf8', function(err) {
      if (err) return console.error(err);
    });
  });
}

const createDatagripSettingsZip = () => {
  zipper.sync.zip("./datagrip-settings/").compress().save(`./datagrip-settings-${Date.now()}.zip`);
}

console.log("converting...")
const datasourcesXml = Object.keys(datasource.connections).reduce((datasources, key) => {

  const uuid = crypto.randomUUID();
  const connection = datasource.connections[key];
  const { name, folder, provider, driver, configuration: { url } } = connection
  const [driverRef, jdbcDriver] = driverAdapter(provider, driver);

  const datasourceXml = `
    <data-source source="LOCAL" name="${name}" group="${folder}" uuid="${uuid}">
      <driver-ref>${driverRef}</driver-ref>
      <synchronize>true</synchronize>
      <jdbc-driver>${jdbcDriver}</jdbc-driver>
      <jdbc-url>${url}</jdbc-url>
      <working-dir>$ProjectFileDir$</working-dir>
    </data-source>`;
  return datasources += datasourceXml
}, "")


// console.log(datasourcesXml)

console.log("generating...")
replaceTemplate(datasourcesXml);

console.log("creating zip...")
createDatagripSettingsZip();

console.log("done!")
