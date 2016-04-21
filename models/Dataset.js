import Backbone from 'backbone';
import MetadataItem from './MetadataItem';
import datalib from 'datalib';

let girder = window.girder;

let COMPATIBLE_TYPES = {
  boolean: ['boolean'],
  integer: ['integer', 'boolean'],
  number: ['number', 'integer', 'boolean'],
  date: ['date'],
  string: ['string', 'date', 'number', 'integer', 'boolean'],
  'string_list': ['string_list']
};

let VALID_EXTENSIONS = [
  'csv',
  'tsv',
  'json'
];

let Dataset = MetadataItem.extend({
  initialize: function () {
    this.rawCache = null;
    this.parsedCache = null;
    let meta = this.getMeta();
    
    let fileTypePromise;
    if (meta.fileType) {
      fileTypePromise = Promise.resolve(meta.fileType);
    } else {
      fileTypePromise = this.inferFileType();
    }
    
    let attributePromise;
    if (meta.attributes) {
      attributePromise = Promise.resolve(meta.attributes);
    } else {
      attributePromise = this.inferAttributes();
    }
    
    Promise.all([fileTypePromise, attributePromise]).then(() => {
      this.save().then(() => {
        this.trigger('rra:changeType');
        this.trigger('rra:changeSpec');
      });
    });
  },
  markObsolete: function () {
    this.obsolete = true;
  },
  save: function () {
    // It's possible for a dataset to be dropped from a collection
    // (e.g. it's replaced with a copy). In this case, we want to
    // stop all future attempts to save any changes to the obsolete
    // dataset)
    if (this.obsolete) {
      return Promise.resolve();
    } else {
      return MetadataItem.prototype.save.apply(this).catch(this.saveFailure);
    }
  },
  saveFailure: function (errorObj) {
    window.mainPage.trigger('rra:error', errorObj);
  },
  loadData: function (cache = true) {
    // TODO: support more file formats / non-Girder
    // files (e.g. pasted browser data)
    if (cache && this.rawCache !== null) {
      return Promise.resolve(this.rawCache);
    } else {
      return Promise.resolve(girder.restRequest({
        path: 'item/' + this.getId() + '/download',
        type: 'GET',
        error: null,
        dataType: 'text'
      })).then((data) => {
        if (cache) {
          this.rawCache = data;
        }
        return data;
      }).catch(() => {
        this.rawCache = null;
        return null;
      });
    }
  },
  getSpec: function () {
    let meta = this.getMeta();
    let spec = {
      name: this.name()
    };
    if (!meta.attributes) {
      // We haven't inferred the attributes yet...
      spec.attributes = {};
    } else {
      spec.attributes = meta.attributes;
    }
    return spec;
  },
  parse: function (cache = true) {
    if (cache && this.parsedCache !== null) {
      return Promise.resolve(this.parsedCache);
    } else {
      let parsedData;
      return this.loadData().then(rawData => {
        if (rawData === null) {
          this.parsedCache = parsedData = null;
        } else {
          let meta = this.getMeta();
          let formatPrefs = {
            type: meta.fileType
          };
          if (meta.attributes) {
            formatPrefs.parse = meta.attributes;
          } else {
            formatPrefs.parse = 'auto';
          }

          try {
            parsedData = datalib.read(rawData, formatPrefs);
          } catch (e) {
            parsedData = null;
          }

          if (cache) {
            this.parsedCache = parsedData;
          }
        }
        return parsedData;
      });
    }
  },
  inferFileType: function () {
    let fileType = this.get('name');
    if (fileType === undefined || fileType.indexOf('.') === -1) {
      fileType = 'txt';
    } else {
      fileType = fileType.split('.');
      fileType = fileType[fileType.length - 1];
    }
    this.setMeta('fileType', fileType);
    return fileType;
  },
  setFileType: function (fileType) {
    this.setMeta('fileType', fileType);
    return this.save().then(() => {
      this.trigger('rra:changeType');
    });
  },
  inferAttributes: function () {
    return this.parse().then(data => {
      let attributes;
      if (data === null) {
        attributes = {};
      } else {
        attributes = datalib.type.all(data);
      }
      this.setMeta('attributes', attributes);
      return attributes;
    });
  },
  setAttribute: function (attrName, dataType) {
    let attributes = this.getMeta('attributes');
    attributes[attrName] = dataType;
    this.setMeta('attributes', attributes);
    return this.save().then(() => {
      this.trigger('rra:changeSpec')
    });
  }
});

Dataset.COMPATIBLE_TYPES = COMPATIBLE_TYPES;
Dataset.VALID_EXTENSIONS = VALID_EXTENSIONS;
Dataset.Collection = Backbone.Collection.extend({
  model: Dataset
});
export default Dataset;
