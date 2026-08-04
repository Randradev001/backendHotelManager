const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

const xpzPath = process.argv[2];
const outputDir = path.resolve(process.argv[3] || path.join('docs', 'migration', 'aperp-model-study'));
const sourceLabel = process.argv[4] || xpzPath;

if (!xpzPath) {
  console.error('Uso: node --max-old-space-size=4096 scripts/study-genexus18-model.js <fuente.xpz> [directorio-salida] [etiqueta-fuente]');
  process.exit(1);
}

const asArray = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
};

const textOf = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return String(value['#text'] || '');
};

const propertiesOf = (node) => Object.fromEntries(
  asArray(node?.Properties?.Property)
    .filter((property) => property?.Name)
    .map((property) => [String(property.Name), textOf(property.Value)])
);

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const writeCsv = (fileName, columns, rows) => {
  const header = columns.map(csvCell).join(',');
  const body = rows.map((row) => columns.map((column) => {
    const value = Array.isArray(row[column]) ? row[column].join(' | ') : row[column];
    return csvCell(value);
  }).join(','));
  fs.writeFileSync(path.join(outputDir, fileName), `\ufeff${header}\n${body.join('\n')}\n`, 'utf8');
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const frameworkPrefixes = [
  'GeneXus.',
  'GeneXusUnanimo.',
  'WWPBaseObjects.',
  'WorkWithPlus.',
  'WorkWithPlus_CommonObjects.',
  'WorkWithPlus_Web.',
  'WorkWithPlus_WebLegacySecurity.'
];

const isFrameworkName = (fullyQualifiedName) => {
  const name = String(fullyQualifiedName || '');
  return frameworkPrefixes.some((prefix) => name === prefix.slice(0, -1) || name.startsWith(prefix));
};

const areaOf = (object, framework) => {
  if (framework) return 'Framework';
  const container = String(object['@parent'] || object['@fullyQualifiedName'] || object['@name'] || 'SinModulo');
  return container.split('.')[0] || 'SinModulo';
};

const collectIndexes = (tableObject) => {
  const indexesPart = asArray(tableObject.Part).find((part) => part?.Indexes)?.Indexes;
  if (!indexesPart) return [];

  return asArray(indexesPart.TableIndex).flatMap((tableIndex) => asArray(tableIndex?.Index)).map((index) => {
    const membersPart = asArray(index.Part).find((part) => part?.Members)?.Members;
    const members = asArray(membersPart?.Member).map((member) => ({
      name: textOf(member),
      order: String(member?.['@Order'] || '')
    }));
    return {
      name: String(index['@name'] || propertiesOf(index).Name || ''),
      type: String(index['@Type'] || ''),
      source: String(index['@Source'] || ''),
      members
    };
  });
};

const buildStudy = async () => {
  const resolvedXpzPath = path.resolve(xpzPath);
  const xpzBuffer = fs.readFileSync(resolvedXpzPath);
  const zip = await JSZip.loadAsync(xpzBuffer);
  const xmlEntry = Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.xml'));
  if (!xmlEntry) throw new Error('La XPZ no contiene un XML exportado.');

  const xmlBuffer = await xmlEntry.async('nodebuffer');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseTagValue: false,
    trimValues: false
  });
  const exportFile = parser.parse(xmlBuffer.toString('utf8')).ExportFile;
  const objects = asArray(exportFile.Objects?.Object);
  const references = asArray(exportFile.Dependencies?.Reference);
  const typeNames = new Map(references
    .filter((reference) => reference['@Type'] === 'Object')
    .map((reference) => [String(reference['@Id']), String(reference.Properties?.['@Name'] || reference['@Id'])]));

  const typedObjects = objects.map((object) => ({
    object,
    type: typeNames.get(String(object['@type'])) || String(object['@type'])
  }));
  const objectsOfType = (type) => typedObjects.filter((item) => item.type === type).map((item) => item.object);

  const domains = objectsOfType('Domain');
  const domainByName = new Map();
  domains.forEach((domain) => {
    domainByName.set(String(domain['@name']).toUpperCase(), domain);
    domainByName.set(String(domain['@fullyQualifiedName']).toUpperCase(), domain);
  });

  const resolveDomain = (basedOn) => {
    const match = /^Domain:([^,]+)(?:,\s*(.+))?$/i.exec(String(basedOn || ''));
    if (!match) return null;
    const shortName = match[1].trim();
    const moduleName = String(match[2] || '').trim();
    return domainByName.get(`${moduleName}.${shortName}`.replace(/^\./, '').toUpperCase())
      || domainByName.get(shortName.toUpperCase())
      || null;
  };

  const attributes = asArray(exportFile.Attributes?.Attribute);
  const attributeByGuid = new Map(attributes.map((attribute) => [String(attribute['@guid']).toLowerCase(), attribute]));
  const attributeByName = new Map(attributes.map((attribute) => [String(attribute['@name']).toUpperCase(), attribute]));
  const attributeDetails = new Map();

  attributes.forEach((attribute) => {
    const props = propertiesOf(attribute);
    const domain = resolveDomain(props.idBasedOn);
    const domainProps = propertiesOf(domain);
    const resolvedType = String(props.ATTCUSTOMTYPE || domainProps.ATTCUSTOMTYPE || 'bas:Numeric');
    const detail = {
      name: String(attribute['@name'] || props.Name || ''),
      description: String(attribute['@description'] || props.Description || ''),
      guid: String(attribute['@guid'] || ''),
      basedOn: String(props.idBasedOn || ''),
      type: resolvedType,
      length: String(props.Length || domainProps.Length || ''),
      decimals: String(props.Decimals || domainProps.Decimals || ''),
      formula: String(props.Formula || ''),
      autoNumber: String(props.AUTONUMBER || domainProps.AUTONUMBER || ''),
      initialValue: String(props.ATT_INITIAL_VALUE || domainProps.ATT_INITIAL_VALUE || ''),
      emptyAsNull: String(props.EmptyAsNull || domainProps.EmptyAsNull || ''),
      picture: String(props.ATT_PICTURE || domainProps.ATT_PICTURE || ''),
      references: []
    };
    attributeDetails.set(detail.guid.toLowerCase(), detail);
    attributeDetails.set(detail.name.toUpperCase(), detail);
  });

  const tableObjects = objectsOfType('Table');
  const tableObjectByName = new Map(tableObjects.map((table) => [String(table['@name']).toUpperCase(), table]));
  const keySignature = (keys) => keys.map((key) => String(key).toUpperCase()).join('|');
  const physicalTableInfo = new Map(tableObjects.map((table) => {
    const keyPart = asArray(table.Part).find((part) => part?.Key)?.Key;
    const keys = asArray(keyPart?.Item).map(textOf);
    return [String(table['@name']).toUpperCase(), {
      object: table,
      description: String(table['@description'] || propertiesOf(table).Description || ''),
      keys,
      indexes: collectIndexes(table)
    }];
  }));
  const tablesByKey = new Map();
  physicalTableInfo.forEach((table, upperName) => {
    const signature = keySignature(table.keys);
    if (!tablesByKey.has(signature)) tablesByKey.set(signature, []);
    tablesByKey.get(signature).push({ ...table, upperName, name: String(table.object['@name'] || '') });
  });

  const normalized = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const commonPrefixLength = (left, right) => {
    const max = Math.min(left.length, right.length);
    let length = 0;
    while (length < max && left[length] === right[length]) length += 1;
    return length;
  };
  const tableMatchScore = (candidate, expectedNames, descriptions) => {
    const name = normalized(candidate.name);
    const description = normalized(candidate.description);
    let score = 0;
    expectedNames.map(normalized).filter(Boolean).forEach((expected) => {
      if (name === expected) score = Math.max(score, 1000);
      if (name.startsWith(expected) || expected.startsWith(name)) score = Math.max(score, 300 + Math.min(name.length, expected.length));
      score = Math.max(score, commonPrefixLength(name, expected) * 10);
    });
    descriptions.map(normalized).filter(Boolean).forEach((expected) => {
      if (description === expected) score = Math.max(score, 800);
      if (description.startsWith(expected) || expected.startsWith(description)) score = Math.max(score, 200 + Math.min(description.length, expected.length));
    });
    return score;
  };
  const resolvePhysicalTable = ({ logicalLevelName, parentTable, transaction, fullKey }) => {
    const transactionName = String(transaction['@name'] || '');
    const expectedNames = depthAwareExpectedNames(logicalLevelName, parentTable, transactionName);
    const exactCandidates = expectedNames
      .map((name) => physicalTableInfo.get(String(name).toUpperCase()))
      .filter(Boolean);
    const exact = exactCandidates.find((candidate) => keySignature(candidate.keys) === keySignature(fullKey));
    if (exact) {
      return {
        tableName: String(exact.object['@name'] || ''),
        method: 'NAME_AND_KEY',
        candidates: [String(exact.object['@name'] || '')]
      };
    }

    const keyCandidates = tablesByKey.get(keySignature(fullKey)) || [];
    if (keyCandidates.length === 1) return { tableName: keyCandidates[0].name, method: 'UNIQUE_KEY', candidates: [keyCandidates[0].name] };
    if (!keyCandidates.length && parentTable) {
      const parentKeys = physicalTableInfo.get(parentTable.toUpperCase())?.keys || [];
      const fullKeySet = new Set(fullKey.map((key) => key.toUpperCase()));
      const childCandidates = [...physicalTableInfo.values()]
        .filter((candidate) => candidate.keys.length > parentKeys.length)
        .filter((candidate) => parentKeys.every((key, index) => candidate.keys[index]?.toUpperCase() === key.toUpperCase()))
        .filter((candidate) => candidate.keys.every((key) => fullKeySet.has(key.toUpperCase())))
        .map((candidate) => ({ ...candidate, name: String(candidate.object['@name'] || '') }));
      if (childCandidates.length === 1) {
        return { tableName: childCandidates[0].name, method: 'PARENT_KEY_SUBSET', candidates: [childCandidates[0].name] };
      }
    }
    if (!keyCandidates.length && exactCandidates.length) {
      return {
        tableName: String(exactCandidates[0].object['@name'] || ''),
        method: 'NAME_ONLY',
        candidates: exactCandidates.map((candidate) => String(candidate.object['@name'] || ''))
      };
    }
    if (!keyCandidates.length) return { tableName: '', method: 'UNRESOLVED', candidates: [] };

    const descriptions = [transaction['@description'], logicalLevelName];
    const ranked = keyCandidates
      .map((candidate) => ({ candidate, score: tableMatchScore(candidate, expectedNames, descriptions) }))
      .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name));
    if (ranked[0].score > ranked[1].score) {
      return { tableName: ranked[0].candidate.name, method: 'KEY_AND_NAME_SIMILARITY', candidates: keyCandidates.map((candidate) => candidate.name) };
    }
    return { tableName: '', method: 'AMBIGUOUS_KEY', candidates: keyCandidates.map((candidate) => candidate.name) };
  };

  function depthAwareExpectedNames(logicalLevelName, parentTable, transactionName) {
    const names = [];
    if (parentTable) names.push(`${parentTable}${logicalLevelName}`);
    names.push(logicalLevelName, transactionName);
    if (/^T[A-Z]/.test(logicalLevelName)) names.push(logicalLevelName.slice(1));
    if (/^T[A-Z]/.test(transactionName)) names.push(transactionName.slice(1));
    return unique(names);
  }

  const transactionObjects = objectsOfType('Transaction');
  const transactionRows = [];
  const levelRows = [];
  const rawTableColumnRows = [];

  transactionObjects.forEach((transaction) => {
    const structurePart = asArray(transaction.Part).find((part) => part?.Level);
    if (!structurePart?.Level) return;

    const framework = isFrameworkName(transaction['@fullyQualifiedName']);
    const area = areaOf(transaction, framework);
    const transactionProperties = propertiesOf(transaction);
    const transactionLevels = [];

    const walkLevel = (level, depth, parentTable, inheritedKeyAttributes) => {
      const logicalLevelName = String(level['@Type'] || level['@Name'] || '');
      const localAttributes = asArray(level.Attribute).map((attributeRef) => ({
        name: textOf(attributeRef),
        guid: String(attributeRef?.['@guid'] || ''),
        localKey: String(attributeRef?.['@key'] || '').toLowerCase() === 'true',
        redundantFormula: String(attributeRef?.['@isRedundant'] || '').toLowerCase() === 'true'
      }));
      const currentKeyAttributes = unique([
        ...inheritedKeyAttributes.map((attribute) => attribute.name),
        ...localAttributes.filter((attribute) => attribute.localKey).map((attribute) => attribute.name)
      ]).map((name) => localAttributes.find((attribute) => attribute.name === name)
        || inheritedKeyAttributes.find((attribute) => attribute.name === name));
      const allAttributes = [];
      [...inheritedKeyAttributes, ...localAttributes].forEach((attribute) => {
        if (!allAttributes.some((current) => current.name.toUpperCase() === attribute.name.toUpperCase())) allAttributes.push(attribute);
      });

      const logicalFullKey = currentKeyAttributes.map((attribute) => attribute.name);
      const resolution = resolvePhysicalTable({ logicalLevelName, parentTable, transaction, fullKey: logicalFullKey });
      const tableName = resolution.tableName || logicalLevelName;
      const physical = physicalTableInfo.get(tableName.toUpperCase());
      const primaryKey = physical?.keys || logicalFullKey;
      const levelRow = {
        area,
        transaction: String(transaction['@name'] || ''),
        transactionFqn: String(transaction['@fullyQualifiedName'] || ''),
        framework,
        table: tableName,
        logicalLevel: logicalLevelName,
        tableResolution: resolution.method,
        tableCandidates: resolution.candidates,
        parentTable: parentTable || '',
        levelName: String(level['@Name'] || ''),
        levelDepth: depth,
        primaryKey,
        localKey: localAttributes.filter((attribute) => attribute.localKey).map((attribute) => attribute.name),
        localAttributeCount: localAttributes.length,
        physicalTableFound: Boolean(physical)
      };
      levelRows.push(levelRow);
      transactionLevels.push(levelRow);

      allAttributes.forEach((attribute, ordinal) => {
        const definition = attributeDetails.get(attribute.guid.toLowerCase())
          || attributeDetails.get(attribute.name.toUpperCase());
        const isLocal = localAttributes.some((current) => current.name.toUpperCase() === attribute.name.toUpperCase());
        const isKey = primaryKey.some((key) => key.toUpperCase() === attribute.name.toUpperCase());
        const formula = String(definition?.formula || '');
        const row = {
          area,
          transaction: String(transaction['@name'] || ''),
          transactionFqn: String(transaction['@fullyQualifiedName'] || ''),
          framework,
          table: tableName,
          logicalLevel: logicalLevelName,
          parentTable: parentTable || '',
          levelDepth: depth,
          ordinal: ordinal + 1,
          attribute: attribute.name,
          attributeGuid: attribute.guid || definition?.guid || '',
          isKey,
          isLocal,
          inheritedKey: !isLocal && isKey,
          redundantFormula: Boolean(attribute.redundantFormula),
          stored: !formula || Boolean(attribute.redundantFormula),
          type: definition?.type || '',
          length: definition?.length || '',
          decimals: definition?.decimals || '',
          basedOn: definition?.basedOn || '',
          formula,
          autoNumber: definition?.autoNumber || '',
          definitionFound: Boolean(definition)
        };
        rawTableColumnRows.push(row);
        if (definition) definition.references.push(tableName);
      });

      asArray(level.Level).forEach((childLevel) => walkLevel(childLevel, depth + 1, tableName, currentKeyAttributes));
    };

    walkLevel(structurePart.Level, 0, '', []);
    transactionRows.push({
      area,
      name: String(transaction['@name'] || ''),
      fullyQualifiedName: String(transaction['@fullyQualifiedName'] || ''),
      description: String(transaction['@description'] || ''),
      parent: String(transaction['@parent'] || ''),
      framework,
      rootTable: transactionLevels.find((level) => level.levelDepth === 0)?.table || '',
      tableCount: transactionLevels.length,
      childLevelCount: transactionLevels.filter((level) => level.levelDepth > 0).length,
      maxLevelDepth: Math.max(...transactionLevels.map((level) => level.levelDepth), 0),
      businessComponent: String(transactionProperties.idISBUSINESSCOMPONENT || ''),
      dynamicTransaction: String(transactionProperties.idIsDynTrn || ''),
      lastUpdate: String(transaction['@lastUpdate'] || '')
    });
  });

  const columnMap = new Map();
  rawTableColumnRows.forEach((column) => {
    const key = `${column.table.toUpperCase()}|${column.attribute.toUpperCase()}`;
    if (!columnMap.has(key)) {
      columnMap.set(key, {
        ...column,
        transactions: [column.transactionFqn],
        logicalLevels: [column.logicalLevel],
        mappingCount: 1
      });
      return;
    }
    const current = columnMap.get(key);
    current.transactions = unique([...current.transactions, column.transactionFqn]);
    current.logicalLevels = unique([...current.logicalLevels, column.logicalLevel]);
    current.mappingCount += 1;
    current.isKey = current.isKey || column.isKey;
    current.stored = current.stored || column.stored;
    current.redundantFormula = current.redundantFormula || column.redundantFormula;
  });
  const tableColumnRows = [...columnMap.values()].sort((left, right) => (
    left.table.localeCompare(right.table) || left.ordinal - right.ordinal || left.attribute.localeCompare(right.attribute)
  ));

  const levelsByTable = new Map();
  levelRows.forEach((level) => {
    const key = level.table.toUpperCase();
    if (!levelsByTable.has(key)) levelsByTable.set(key, []);
    levelsByTable.get(key).push(level);
  });
  const columnsByTable = new Map();
  tableColumnRows.forEach((column) => {
    const key = column.table.toUpperCase();
    if (!columnsByTable.has(key)) columnsByTable.set(key, []);
    columnsByTable.get(key).push(column);
  });

  const tableRows = tableObjects.map((table) => {
    const tableName = String(table['@name'] || '');
    const mappedLevels = levelsByTable.get(tableName.toUpperCase()) || [];
    const mappedLevel = mappedLevels.find((level) => !level.framework) || mappedLevels[0];
    const columns = columnsByTable.get(tableName.toUpperCase()) || [];
    const physical = physicalTableInfo.get(tableName.toUpperCase());
    return {
      area: mappedLevel?.area || 'SinMapeo',
      transaction: mappedLevel?.transaction || '',
      transactionFqn: mappedLevel?.transactionFqn || '',
      framework: mappedLevels.length ? mappedLevels.every((level) => level.framework) : false,
      name: tableName,
      description: String(table['@description'] || propertiesOf(table).Description || ''),
      levelDepth: mappedLevel?.levelDepth ?? '',
      parentTable: mappedLevel?.parentTable || '',
      primaryKey: physical?.keys || [],
      indexCount: physical?.indexes.length || 0,
      indexes: (physical?.indexes || []).map((index) => `${index.name}:${index.type}:${index.members.map((member) => `${member.name} ${member.order}`.trim()).join('+')}`),
      columnCount: columns.length,
      storedColumnCount: columns.filter((column) => column.stored).length,
      formulaCount: columns.filter((column) => !column.stored).length,
      mappedLevelCount: mappedLevels.length,
      transactions: unique(mappedLevels.map((level) => level.transactionFqn)),
      logicalLevels: unique(mappedLevels.map((level) => level.logicalLevel)),
      resolutionMethods: unique(mappedLevels.map((level) => level.tableResolution)),
      lastUpdate: String(table['@lastUpdate'] || '')
    };
  }).sort((left, right) => left.area.localeCompare(right.area) || left.name.localeCompare(right.name));

  const confirmedRelations = levelRows.filter((level) => level.parentTable).map((level) => {
    const parent = physicalTableInfo.get(level.parentTable.toUpperCase());
    const child = physicalTableInfo.get(level.table.toUpperCase());
    const parentKey = parent?.keys || [];
    const childKey = child?.keys || [];
    return {
      area: level.area,
      transaction: level.transactionFqn,
      relationType: 'TRANSACTION_LEVEL',
      parentTable: level.parentTable,
      childTable: level.table,
      parentKey,
      childKey,
      sharedKey: parentKey.filter((key) => childKey.some((childItem) => childItem.toUpperCase() === key.toUpperCase())),
      status: 'CONFIRMED_IN_GX_STRUCTURE'
    };
  });

  const applicationTables = tableRows.filter((table) => !table.framework && table.area !== 'SinMapeo');
  const rootApplicationTables = applicationTables.filter((table) => table.levelDepth === 0 && table.primaryKey.length);
  const candidateRelations = [];
  applicationTables.forEach((source) => {
    const sourceColumns = new Set((columnsByTable.get(source.name.toUpperCase()) || [])
      .filter((column) => column.stored)
      .map((column) => column.attribute.toUpperCase()));
    rootApplicationTables.forEach((target) => {
      if (source.name.toUpperCase() === target.name.toUpperCase()) return;
      if (source.parentTable.toUpperCase() === target.name.toUpperCase()) return;
      if (!target.primaryKey.every((key) => sourceColumns.has(key.toUpperCase()))) return;
      const sourceKey = new Set(source.primaryKey.map((key) => key.toUpperCase()));
      candidateRelations.push({
        sourceArea: source.area,
        sourceTable: source.name,
        targetArea: target.area,
        targetTable: target.name,
        sharedKey: target.primaryKey,
        confidence: target.primaryKey.every((key) => sourceKey.has(key.toUpperCase()))
          ? 'HIGH_KEY_COMPOSITION'
          : 'MEDIUM_SHARED_GX_ATTRIBUTES',
        status: 'CANDIDATE_REQUIRES_SQL_OR_RULE_REVIEW'
      });
    });
  });

  const subtypeRows = objectsOfType('Subtype Group').flatMap((group) => {
    const framework = isFrameworkName(group['@fullyQualifiedName']);
    return asArray(group.Part).flatMap((part) => asArray(part.Subtype)).map((subtype) => ({
      area: areaOf(group, framework),
      group: String(group['@fullyQualifiedName'] || group['@name'] || ''),
      framework,
      subtype: String(subtype.Name || ''),
      subtypeGuid: String(subtype['@guid'] || ''),
      supertype: textOf(subtype.Supertype),
      supertypeGuid: String(subtype.Supertype?.['@guid'] || '')
    }));
  });

  const domainRows = domains.map((domain) => {
    const props = propertiesOf(domain);
    const framework = isFrameworkName(domain['@fullyQualifiedName']);
    return {
      area: areaOf(domain, framework),
      name: String(domain['@name'] || ''),
      fullyQualifiedName: String(domain['@fullyQualifiedName'] || ''),
      description: String(domain['@description'] || props.Description || ''),
      framework,
      type: String(props.ATTCUSTOMTYPE || 'bas:Numeric'),
      length: String(props.Length || ''),
      decimals: String(props.Decimals || ''),
      picture: String(props.ATT_PICTURE || ''),
      enumValues: String(props.IDEnumDefinedValues || ''),
      initialValue: String(props.ATT_INITIAL_VALUE || ''),
      emptyAsNull: String(props.EmptyAsNull || '')
    };
  }).sort((left, right) => left.area.localeCompare(right.area) || left.name.localeCompare(right.name));

  const attributeRows = attributes.map((attribute) => {
    const detail = attributeDetails.get(String(attribute['@guid']).toLowerCase());
    return {
      name: detail.name,
      description: detail.description,
      guid: detail.guid,
      basedOn: detail.basedOn,
      type: detail.type,
      length: detail.length,
      decimals: detail.decimals,
      formula: detail.formula,
      autoNumber: detail.autoNumber,
      initialValue: detail.initialValue,
      emptyAsNull: detail.emptyAsNull,
      picture: detail.picture,
      tableReferenceCount: unique(detail.references).length,
      tables: unique(detail.references).sort()
    };
  }).sort((left, right) => left.name.localeCompare(right.name));

  const tableRowByName = new Map(tableRows.map((table) => [table.name.toUpperCase(), table]));
  const objectRows = typedObjects.map(({ object, type }) => {
    const mappedTable = type === 'Table' ? tableRowByName.get(String(object['@name']).toUpperCase()) : null;
    const framework = mappedTable ? mappedTable.framework : isFrameworkName(object['@fullyQualifiedName']);
    return {
      type,
      name: String(object['@name'] || ''),
      fullyQualifiedName: String(object['@fullyQualifiedName'] || ''),
      description: String(object['@description'] || ''),
      parent: String(object['@parent'] || ''),
      area: mappedTable?.area || areaOf(object, framework),
      framework,
      user: String(object['@user'] || ''),
      lastUpdate: String(object['@lastUpdate'] || ''),
      guid: String(object['@guid'] || '')
    };
  }).sort((left, right) => left.type.localeCompare(right.type) || left.fullyQualifiedName.localeCompare(right.fullyQualifiedName));

  const objectTypeCounts = objectRows.reduce((counts, object) => {
    if (!counts[object.type]) counts[object.type] = { total: 0, application: 0, framework: 0 };
    counts[object.type].total += 1;
    counts[object.type][object.framework ? 'framework' : 'application'] += 1;
    return counts;
  }, {});
  const applicationTransactionRows = transactionRows.filter((transaction) => !transaction.framework);
  const applicationAreaCounts = applicationTransactionRows.reduce((counts, transaction) => {
    counts[transaction.area] = (counts[transaction.area] || 0) + 1;
    return counts;
  }, {});
  const applicationTableAreaCounts = applicationTables.reduce((counts, table) => {
    counts[table.area] = (counts[table.area] || 0) + 1;
    return counts;
  }, {});
  const companyScopedTables = applicationTables.filter((table) => (columnsByTable.get(table.name.toUpperCase()) || [])
    .some((column) => ['GECODEMP', 'EMPCOD'].includes(column.attribute.toUpperCase())));
  const tablesWithoutCompanyAttribute = applicationTables.filter((table) => !companyScopedTables.includes(table));
  const formulaColumns = tableColumnRows.filter((column) => !column.stored);
  const redundantFormulaColumns = tableColumnRows.filter((column) => column.formula && column.redundantFormula);
  const keylessTables = tableRows.filter((table) => table.primaryKey.length === 0);
  const unmappedTables = tableRows.filter((table) => table.mappedLevelCount === 0);
  const missingPhysicalTables = levelRows.filter((level) => !level.physicalTableFound);
  const ambiguousLevels = levelRows.filter((level) => level.tableResolution === 'AMBIGUOUS_KEY');
  const duplicateMappings = tableRows.filter((table) => table.mappedLevelCount > 1);
  const unresolvedDefinitions = tableColumnRows.filter((column) => !column.definitionFound);
  const unresolvedTypes = tableColumnRows.filter((column) => !column.type);
  const longTableNames = tableRows.filter((table) => table.name.length > 30);
  const longAttributeNames = attributeRows.filter((attribute) => attribute.name.length > 30);
  const autoNumberAttributes = attributeRows.filter((attribute) => /^true$/i.test(attribute.autoNumber));

  const environment = asArray(exportFile.KnowledgeBase?.Environments?.Environment)[0];
  const generatorPart = asArray(environment?.Part).find((part) => part?.Generator)?.Generator;
  const dataStorePart = asArray(environment?.Part).find((part) => part?.DataStore)?.DataStore;
  const summary = {
    generatedAt: new Date().toISOString(),
    scope: 'Logical GeneXus model study only',
    source: {
      label: sourceLabel,
      analyzedCopy: resolvedXpzPath,
      archiveEntry: xmlEntry.name,
      size: xpzBuffer.length,
      sha256: crypto.createHash('sha256').update(xpzBuffer).digest('hex')
    },
    knowledgeBase: {
      name: String(exportFile.KnowledgeBase?.['@name'] || exportFile.Source?.Version?.['@name'] || ''),
      sourcePath: String(exportFile.Source?.['@UNCPath'] || ''),
      kmwMajor: String(exportFile.KMW?.MajorVersion || ''),
      kmwMinor: String(exportFile.KMW?.MinorVersion || ''),
      kmwBuild: String(exportFile.KMW?.Build || ''),
      environment: String(environment?.['@name'] || ''),
      generatedLanguage: String(propertiesOf(environment).GeneratedLanguage || ''),
      multiTenant: String(propertiesOf(environment).idMULTITENANT || ''),
      startupObject: String(propertiesOf(environment).StartupObject || ''),
      generator: String(generatorPart?.Name || ''),
      generatorId: String(generatorPart?.Generator || ''),
      dataStore: String(dataStorePart?.Name || ''),
      dbmsId: String(dataStorePart?.Dbms || ''),
      databaseReferentialIntegrity: String(propertiesOf(dataStorePart).DCL_REF_INT_DB || '')
    },
    counts: {
      objects: objectRows.length,
      objectTypes: objectTypeCounts,
      transactions: transactionRows.length,
      applicationTransactions: applicationTransactionRows.length,
      frameworkTransactions: transactionRows.filter((transaction) => transaction.framework).length,
      transactionLevels: levelRows.length,
      subordinateLevels: levelRows.filter((level) => level.levelDepth > 0).length,
      tables: tableRows.length,
      applicationTables: applicationTables.length,
      attributes: attributeRows.length,
      tableColumnPlacements: tableColumnRows.length,
      logicalColumnPlacementsBeforeTableDeduplication: rawTableColumnRows.length,
      formulaAttributes: attributeRows.filter((attribute) => attribute.formula).length,
      formulaColumnPlacements: formulaColumns.length,
      redundantFormulaColumnPlacements: redundantFormulaColumns.length,
      autoNumberAttributes: autoNumberAttributes.length,
      domains: domainRows.length,
      subtypeGroups: objectsOfType('Subtype Group').length,
      subtypeMappings: subtypeRows.length,
      confirmedLevelRelations: confirmedRelations.length,
      candidateRelations: candidateRelations.length,
      tablesReusedByMultipleTransactionLevels: duplicateMappings.length
    },
    applicationTransactionsByArea: Object.fromEntries(Object.entries(applicationAreaCounts).sort(([left], [right]) => left.localeCompare(right))),
    applicationTablesByArea: Object.fromEntries(Object.entries(applicationTableAreaCounts).sort(([left], [right]) => left.localeCompare(right))),
    companyScope: {
      explicitAttributes: ['GECODEMP', 'EmpCod'],
      applicationTablesWithCompanyAttribute: companyScopedTables.length,
      applicationTablesWithoutCompanyAttribute: tablesWithoutCompanyAttribute.length,
      tablesWithoutCompanyAttribute: tablesWithoutCompanyAttribute.map((table) => table.name)
    },
    checks: {
      keylessTables: keylessTables.map((table) => table.name),
      unmappedTables: unmappedTables.map((table) => table.name),
      missingPhysicalTables: missingPhysicalTables.map((level) => `${level.transactionFqn}:${level.logicalLevel}`),
      ambiguousTableLevels: ambiguousLevels.map((level) => `${level.transactionFqn}:${level.logicalLevel}`),
      duplicateTableMappings: duplicateMappings.map((table) => table.name),
      unresolvedAttributeDefinitions: unique(unresolvedDefinitions.map((column) => column.attribute)),
      unresolvedAttributeTypes: unique(unresolvedTypes.map((column) => column.attribute)),
      tableNamesOver30Characters: longTableNames.map((table) => table.name),
      attributeNamesOver30Characters: longAttributeNames.map((attribute) => attribute.name)
    }
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'model-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  writeCsv('objects.csv', ['type', 'name', 'fullyQualifiedName', 'description', 'parent', 'area', 'framework', 'user', 'lastUpdate', 'guid'], objectRows);
  writeCsv('transactions.csv', ['area', 'name', 'fullyQualifiedName', 'description', 'parent', 'framework', 'rootTable', 'tableCount', 'childLevelCount', 'maxLevelDepth', 'businessComponent', 'dynamicTransaction', 'lastUpdate'], transactionRows);
  writeCsv('tables.csv', ['area', 'transaction', 'transactionFqn', 'framework', 'name', 'description', 'levelDepth', 'parentTable', 'primaryKey', 'indexCount', 'indexes', 'columnCount', 'storedColumnCount', 'formulaCount', 'mappedLevelCount', 'transactions', 'logicalLevels', 'resolutionMethods', 'lastUpdate'], tableRows);
  writeCsv('table-columns.csv', ['area', 'transaction', 'transactionFqn', 'transactions', 'framework', 'table', 'logicalLevel', 'logicalLevels', 'parentTable', 'levelDepth', 'ordinal', 'attribute', 'attributeGuid', 'isKey', 'isLocal', 'inheritedKey', 'stored', 'redundantFormula', 'type', 'length', 'decimals', 'basedOn', 'formula', 'autoNumber', 'mappingCount', 'definitionFound'], tableColumnRows);
  writeCsv('attributes.csv', ['name', 'description', 'guid', 'basedOn', 'type', 'length', 'decimals', 'formula', 'autoNumber', 'initialValue', 'emptyAsNull', 'picture', 'tableReferenceCount', 'tables'], attributeRows);
  writeCsv('domains.csv', ['area', 'name', 'fullyQualifiedName', 'description', 'framework', 'type', 'length', 'decimals', 'picture', 'enumValues', 'initialValue', 'emptyAsNull'], domainRows);
  writeCsv('subtypes.csv', ['area', 'group', 'framework', 'subtype', 'subtypeGuid', 'supertype', 'supertypeGuid'], subtypeRows);
  writeCsv('relations-confirmed.csv', ['area', 'transaction', 'relationType', 'parentTable', 'childTable', 'parentKey', 'childKey', 'sharedKey', 'status'], confirmedRelations);
  writeCsv('relations-candidates.csv', ['sourceArea', 'sourceTable', 'targetArea', 'targetTable', 'sharedKey', 'confidence', 'status'], candidateRelations);

  const areaLines = unique([
    ...Object.keys(summary.applicationTransactionsByArea),
    ...Object.keys(summary.applicationTablesByArea)
  ]).sort().map((area) => `| ${area} | ${summary.applicationTransactionsByArea[area] || 0} | ${summary.applicationTablesByArea[area] || 0} |`)
    .join('\n');
  const childRelationLines = confirmedRelations.length
    ? confirmedRelations.map((relation) => `- \`${relation.parentTable}\` -> \`${relation.childTable}\` (${relation.sharedKey.join(', ')})`).join('\n')
    : '- No se detectaron niveles subordinados.';
  const issueLine = (items, okText, issueText) => items.length
    ? `- ${issueText}: **${items.length}** (${items.slice(0, 12).map((item) => `\`${item}\``).join(', ')}${items.length > 12 ? ', ...' : ''}).`
    : `- ${okText}.`;

  const readme = `# Estudio inicial del modelo APERP\n\n` +
    `## Alcance\n\n` +
    `Este inventario estudia exclusivamente el modelo logico exportado por GeneXus. No implementa funcionalidad, no cambia estados de migracion y no considera una tabla de nivel subordinado como maestro independiente.\n\n` +
    `La fuente APERP se mantiene separada del inventario GX8 de CONEX ya existente en este repositorio.\n\n` +
    `## Fuente y entorno\n\n` +
    `- XPZ: \`${sourceLabel}\`\n` +
    `- SHA-256: \`${summary.source.sha256}\`\n` +
    `- Knowledge Base: **${summary.knowledgeBase.name}**\n` +
    `- Entorno: **${summary.knowledgeBase.environment}**; generador **${summary.knowledgeBase.generatedLanguage}**; datastore SQL Server (DBMS ${summary.knowledgeBase.dbmsId})\n` +
    `- Multitenancy GeneXus: **${summary.knowledgeBase.multiTenant}**\n` +
    `- Integridad referencial generada en base: **${summary.knowledgeBase.databaseReferentialIntegrity}**\n` +
    `- KMW: ${summary.knowledgeBase.kmwMajor}.${summary.knowledgeBase.kmwMinor}, build ${summary.knowledgeBase.kmwBuild}\n\n` +
    `## Magnitud del modelo\n\n` +
    `- Objetos exportados: **${summary.counts.objects}**\n` +
    `- Transacciones: **${summary.counts.transactions}** (${summary.counts.applicationTransactions} de aplicacion y ${summary.counts.frameworkTransactions} de framework)\n` +
    `- Tablas fisicas declaradas por GeneXus: **${summary.counts.tables}** (${summary.counts.applicationTables} asociadas a la aplicacion)\n` +
    `- Niveles logicos de transaccion: **${summary.counts.transactionLevels}**, de los cuales **${summary.counts.subordinateLevels}** son subordinados\n` +
    `- Atributos globales: **${summary.counts.attributes}**\n` +
    `- Dominios: **${summary.counts.domains}**\n` +
    `- Grupos de subtipos: **${summary.counts.subtypeGroups}**, con ${summary.counts.subtypeMappings} mapeos\n` +
    `- Atributos formula: **${summary.counts.formulaAttributes}**; hay ${summary.counts.formulaColumnPlacements} usos virtuales y ${summary.counts.redundantFormulaColumnPlacements} usos redundantes persistidos\n` +
    `- Atributos autonumerados: **${summary.counts.autoNumberAttributes}**\n\n` +
    `Aunque la propiedad multitenant de GeneXus esta desactivada, **${summary.companyScope.applicationTablesWithCompanyAttribute}** de ${summary.counts.applicationTables} tablas de aplicacion incluyen explicitamente \`GECODEMP\` o \`EmpCod\`; las ${summary.companyScope.applicationTablesWithoutCompanyAttribute} restantes deben clasificarse individualmente como globales o pendientes de alcance empresarial.\n\n` +
    `## Transacciones de aplicacion por area\n\n` +
    `| Area | Transacciones | Tablas fisicas |\n|---|---:|---:|\n${areaLines}\n\n` +
    `## Niveles subordinados confirmados\n\n${childRelationLines}\n\n` +
    `Estas ${summary.counts.confirmedLevelRelations} relaciones provienen directamente de la estructura de las transacciones GeneXus. Ademas, ${summary.counts.tablesReusedByMultipleTransactionLevels} tablas fisicas son reutilizadas por mas de una vista transaccional; no representan tablas duplicadas. El archivo \`relations-candidates.csv\` contiene asociaciones inferidas por reutilizacion de llaves GeneXus y requiere validacion contra reglas o SQL Server.\n\n` +
    `## Controles de consistencia\n\n` +
    `${issueLine(summary.checks.unmappedTables, 'Todas las tablas se vincularon a un nivel de transaccion', 'Tablas sin nivel de transaccion')}\n` +
    `${issueLine(summary.checks.missingPhysicalTables, 'Todos los niveles tienen una tabla fisica declarada en el XPZ', 'Niveles sin tabla declarada')}\n` +
    `${issueLine(summary.checks.ambiguousTableLevels, 'Todos los niveles se asociaron sin ambiguedad por nombre o llave', 'Niveles con asociacion de tabla ambigua')}\n` +
    `${issueLine(summary.checks.keylessTables, 'Todas las tablas tienen llave primaria GeneXus', 'Tablas sin llave primaria GeneXus')}\n` +
    `${issueLine(summary.checks.unresolvedAttributeDefinitions, 'Todos los atributos usados tienen definicion global', 'Atributos usados sin definicion global')}\n` +
    `${issueLine(summary.checks.unresolvedAttributeTypes, 'Todos los atributos usados resuelven tipo base o dominio', 'Atributos con tipo no resuelto')}\n` +
    `${issueLine(summary.checks.tableNamesOver30Characters, 'Los nombres de tabla respetan el limite configurado de 30 caracteres', 'Tablas sobre el limite de 30 caracteres')}\n` +
    `${issueLine(summary.checks.attributeNamesOver30Characters, 'Los nombres de atributo respetan el limite configurado de 30 caracteres', 'Atributos sobre el limite de 30 caracteres')}\n\n` +
    `## Estado del contraste fisico\n\n` +
    `Se confirmo la existencia de \`BDAPERP.mdf\` y \`BDAPERP_log.ldf\`, sin modificar los originales. La base no estaba publicada en la instancia predeterminada de \`apserver01\` y no existe un motor SQL Server local disponible para adjuntar una copia. Por tanto, tipos SQL exactos, nulabilidad real, constraints, llaves foraneas e indices materializados quedan pendientes de contraste fisico.\n\n` +
    `## Archivos generados\n\n` +
    `- \`model-summary.json\`: resumen verificable y controles.\n` +
    `- \`objects.csv\`: inventario completo de objetos y clasificacion framework/aplicacion.\n` +
    `- \`transactions.csv\`: transacciones, area y niveles.\n` +
    `- \`tables.csv\`: tablas, llaves, indices y jerarquia.\n` +
    `- \`table-columns.csv\`: columnas logicas por tabla, incluidas llaves heredadas de niveles superiores.\n` +
    `- \`attributes.csv\`, \`domains.csv\`, \`subtypes.csv\`: diccionarios del modelo. Cuando el XPZ omite el tipo base explicito, se registra el valor predeterminado GeneXus \`Numeric\`.\n` +
    `- \`relations-confirmed.csv\`: relaciones padre-hijo confirmadas por niveles GeneXus.\n` +
    `- \`relations-candidates.csv\`: relaciones candidatas que aun no deben tratarse como constraints confirmados.\n`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf8');
  console.log(`Estudio generado: ${transactionRows.length} transacciones, ${tableRows.length} tablas y ${attributeRows.length} atributos en ${outputDir}`);
};

buildStudy().catch((error) => {
  console.error(error);
  process.exit(1);
});
