import Ember from 'ember';
import { datasetClassifiers } from 'wherehows-web/constants/dataset-classification';

const { assert, Logger: { warn } } = Ember;

/**
 * Builds a default shape for securitySpecification & privacyCompliancePolicy with default / unset values
 *   for non null properties as per Avro schema
 * @param {Number} datasetId id for the dataset that this privacy object applies to
 */
const createInitialComplianceInfo = datasetId => ({
  datasetId,
  // default to first item in compliance types list
  complianceType: 'AUTO_PURGE',
  complianceEntities: [],
  fieldClassification: {},
  datasetClassification: {},
  geographicAffinity: { affinity: '' },
  recordOwnerType: '',
  retentionPolicy: { retentionType: '' }
});

/**
 *
 * @type {{complianceEntities: {type: string, of: {type: string, keys: [*]}}, datasetClassification: {type: string, keys: (*)}, fieldClassification: {type: string}}}
 */
const policyShape = {
  complianceEntities: {
    type: 'array',
    of: {
      type: 'object',
      keys: [
        'identifierField:string',
        'identifierType:string',
        'securityClassification:string|object',
        'logicalType:string|object|undefined'
      ]
    }
  },
  datasetClassification: { type: 'object', keys: Object.keys(datasetClassifiers).map(key => `${key}:boolean`) }
};

/**
 * Checks that a policy is valid
 * @param candidatePolicy
 * @return {boolean}
 */
const isPolicyExpectedShape = (candidatePolicy = {}) => {
  const candidateMatchesShape = policyKey => {
    assert(
      `Expected each compliance policy attribute to be one of ${Object.keys(policyShape)}, but got ${policyKey}`,
      policyShape.hasOwnProperty(policyKey)
    );

    const policyProps = policyShape[policyKey];
    const expectedType = policyProps.type;
    const policyKeyValue = candidatePolicy[policyKey];
    const isValueExpectedType =
      expectedType === 'array' ? Array.isArray(policyKeyValue) : typeof policyKeyValue === expectedType;
    const typeDeclarations =
      {
        get array() {
          return policyProps.of.keys;
        },
        get object() {
          return policyProps.keys;
        }
      }[expectedType] || [];

    if (!policyKeyValue || !isValueExpectedType) {
      return false;
    }

    if (expectedType === 'array') {
      return policyKeyValue.every(value => {
        if (!value && typeof value !== policyProps.of.type) {
          warn(`Typedefs for ${policyKey} with value ${policyKeyValue} does not equal ${policyProps.of.type}`);
          return false;
        }

        return typeDeclarations.every(typeString => {
          const [key, type] = typeString.split(':');
          const result = type.includes(typeof value[key]);
          if (!result) {
            warn(`Typedefs for ${policyKey} don't include '${typeof value[key]}' for ${key}`);
          }

          return result;
        });
      });
    }

    if (expectedType === typeof {}) {
      return typeDeclarations.every(typeString => {
        const [key, type] = typeString.split(':');
        const result = type.includes(typeof policyKeyValue[key]);
        if (!result) {
          warn(`Typedefs for ${policyKey} don't include ${typeof policyKeyValue[key]} for ${key}`);
        }

        return result;
      });
    }
  };

  if (typeof candidatePolicy === 'object' && candidatePolicy) {
    return Object.keys(policyShape).every(candidateMatchesShape);
  }

  return false;
};

/**
 * Checks if a compliance policy changeSet field requires user attention: if a suggestion
 * is available  but the user has not indicated intent or a policy for the field does not currently exist remotely
 * and the related field changeSet has not been modified on the client
 * @param {boolean} isDirty flag indicating the field changeSet has been modified on the client
 * @param {object|void} suggestion the field suggestion properties
 * @param {boolean} privacyPolicyExists flag indicating that the field has a current policy upstream
 * @param {string} suggestionAuthority possibly empty string indicating the user intent for the suggestion
 * @return {boolean}
 */
const fieldChangeSetRequiresReview = ({ isDirty, suggestion, privacyPolicyExists, suggestionAuthority } = {}) => {
  if (suggestion) {
    return !suggestionAuthority;
  }

  // If either the privacy policy exists, or user has made changes, then no review is required
  return !(privacyPolicyExists || isDirty);
};

/**
 * Merges the column fields with the suggestion for the field if available
 * @param {object} mappedColumnFields a map of column fields to compliance entity properties
 * @param {object} fieldSuggestionMap a map of field suggestion properties keyed by field name
 * @return {Array<object>} mapped column field augmented with suggestion if available
 */
const mergeMappedColumnFieldsWithSuggestions = (mappedColumnFields = {}, fieldSuggestionMap = {}) =>
  Object.keys(mappedColumnFields).map(fieldName => {
    const {
      identifierField,
      dataType,
      identifierType,
      logicalType,
      securityClassification,
      privacyPolicyExists,
      isDirty
    } = mappedColumnFields[fieldName];
    const suggestion = fieldSuggestionMap[identifierField];

    const field = {
      identifierField,
      dataType,
      identifierType,
      logicalType,
      privacyPolicyExists,
      isDirty,
      classification: securityClassification
    };

    // If a suggestion exists for this field add the suggestion attribute to the field properties
    if (suggestion) {
      return { ...field, suggestion };
    }

    return field;
  });

export {
  createInitialComplianceInfo,
  isPolicyExpectedShape,
  fieldChangeSetRequiresReview,
  mergeMappedColumnFieldsWithSuggestions
};
