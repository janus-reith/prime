import { PrimeField, PrimeFieldContext, PrimeFieldOperation } from '@primecms/field';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { camelCase, upperFirst } from 'lodash';

interface Options {
  repeated: boolean;
}

export class PrimeFieldGroup extends PrimeField {
  public static type = 'group';
  public static title = 'Group';
  public static description = 'Group other fields to list';
  public static defaultOptions: Options = {
    repeated: true,
  };

  public async outputType(context: PrimeFieldContext, operation: PrimeFieldOperation.READ) {
    const { name, uniqueTypeName } = context;
    const fields = {};
    const children = context.fields.filter(f => f.parentFieldId === this.schemaField.id);

    for (const field of children) {
      if (field.primeField) {
        const fieldType = await field.primeField.outputType(context, operation);
        if (fieldType) {
          fields[field.name] = fieldType;
        }
      }
    }

    const type = new GraphQLObjectType({
      name: uniqueTypeName(`${name}_${upperFirst(camelCase(this.schemaField.name))}`),
      fields,
    });

    return {
      type: this.options.repeated ? new GraphQLList(type) : type,
    };
  }

  public async inputType(
    context: PrimeFieldContext,
    operation: PrimeFieldOperation.CREATE | PrimeFieldOperation.UPDATE
  ) {
    const { name, uniqueTypeName } = context;
    const fields = {};
    const children = context.fields.filter(f => f.parentFieldId === this.schemaField.id);

    for (const field of children) {
      if (field.primeField) {
        const fieldType = await field.primeField.inputType(context, operation);
        if (fieldType) {
          fields[field.name] = fieldType;
        }
      }
    }

    const operationNames = {
      [PrimeFieldOperation.CREATE]: 'Create',
      [PrimeFieldOperation.UPDATE]: 'Update',
    };

    const type = new GraphQLInputObjectType({
      name: uniqueTypeName(
        `${name}_${upperFirst(camelCase(this.schemaField.name))}${operationNames[operation]}Input`
      ),
      fields,
    });

    return {
      type: this.options.repeated ? new GraphQLList(type) : type,
    };
  }

  public async whereType(context: PrimeFieldContext) {
    const name = context.uniqueTypeName(
      `${context.name}_Sort_${upperFirst(camelCase(this.schemaField.name))}`
    );

    const fields = {};

    for (const field of context.fields) {
      if (field.parentFieldId === this.schemaField.id && field.primeField) {
        const WhereType = await field.primeField.whereType({
          ...context,
          name,
        });
        if (WhereType) {
          fields[field.name] = {
            type: WhereType,
          };
        }
      }
    }

    return new GraphQLInputObjectType({
      name,
      fields,
    });
  }

  public async processOutput(value) {
    if (!Array.isArray(value) && this.options.repeated) {
      return [value];
    }

    if (Array.isArray(value) && !this.options.repeated) {
      return value[0];
    }

    return value;
  }
}
