import { Request, RequestHandler, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { z, ZodEffects, ZodError, ZodSchema, ZodType, ZodTypeDef } from 'zod';

type NonReadOnly<T> = { -readonly [P in keyof T]: NonReadOnly<T[P]> };

export function stripReadOnly<T>(readOnlyItem: T): NonReadOnly<T> {
  return readOnlyItem as NonReadOnly<T>;
}

export declare type RequestValidation<TParams, TQuery, TBody, THeaders> = {
  params?: ZodSchema<TParams>;
  query?: ZodSchema<TQuery>;
  body?: ZodSchema<TBody>;
  headers?: ZodSchema<THeaders>;
};
export declare type RequestProcessing<TParams, TQuery, TBody, THeaders> = {
  params?: ZodEffects<any, TParams>;
  query?: ZodEffects<any, TQuery>;
  body?: ZodEffects<any, TBody>;
  headers?: ZodSchema<THeaders>;
};

export declare type TypedRequest<
  TParams extends ZodType<any, ZodTypeDef, any>,
  TQuery extends ZodType<any, ZodTypeDef, any>,
  TBody extends ZodType<any, ZodTypeDef, any>,
  THeaders extends ZodType<any, ZodTypeDef, any>,
> = Request<z.infer<TParams>, any, z.infer<TBody>, z.infer<TQuery>, z.infer<THeaders>>;

export declare type TypedRequestBody<TBody extends ZodType<any, ZodTypeDef, any>> = Request<
  ParamsDictionary,
  any,
  z.infer<TBody>,
  any
>;

export declare type TypedRequestParams<TParams extends ZodType<any, ZodTypeDef, any>> = Request<
  z.infer<TParams>,
  any,
  any,
  any
>;
export declare type TypedRequestQuery<TQuery extends ZodType<any, ZodTypeDef, any>> = Request<
  ParamsDictionary,
  any,
  any,
  z.infer<TQuery>
>;

type ErrorListItem = { type: 'Query' | 'Params' | 'Body' | 'Headers'; errors: ZodError<any> };

export const sendErrors: (errors: Array<ErrorListItem>, res: Response) => void = (errors, res) => {
  return res.status(400).send(errors.map((error) => ({ type: error.type, errors: error.errors })));
};
export const sendError: (error: ErrorListItem, res: Response) => void = (error, res) => {
  return res.status(400).send({ type: error.type, errors: error.errors });
};

export function processRequestBody<TBody>(effects: ZodSchema<TBody>): RequestHandler<ParamsDictionary, any, TBody, any>;
export function processRequestBody<TBody>(
  effects: ZodEffects<any, TBody>,
): RequestHandler<ParamsDictionary, any, TBody, any>;
export function processRequestBody<TBody>(
  effectsSchema: ZodEffects<any, TBody> | ZodSchema<TBody>,
): RequestHandler<ParamsDictionary, any, TBody, any> {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.body);
    if (parsed.success) {
      req.body = parsed.data;
      return next();
    } else {
      return sendErrors([{ type: 'Body', errors: parsed.error }], res);
    }
  };
}

export function processRequestParams<TParams>(effects: ZodSchema<TParams>): RequestHandler<TParams, any, any, any>;
export function processRequestParams<TParams>(
  effects: ZodEffects<any, TParams>,
): RequestHandler<TParams, any, any, any>;
export function processRequestParams<TParams>(
  effectsSchema: ZodEffects<any, TParams> | ZodSchema<TParams>,
): RequestHandler<TParams, any, any, any> {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.params);
    if (parsed.success) {
      req.params = parsed.data;
      return next();
    } else {
      return sendErrors([{ type: 'Params', errors: parsed.error }], res);
    }
  };
}

export function processRequestQuery<TQuery>(
  effects: ZodSchema<TQuery>,
): RequestHandler<ParamsDictionary, any, any, TQuery>;
export function processRequestQuery<TQuery>(
  effects: ZodEffects<any, TQuery>,
): RequestHandler<ParamsDictionary, any, any, TQuery>;
export function processRequestQuery<TQuery>(
  effectsSchema: ZodEffects<any, TQuery> | ZodSchema<TQuery>,
): RequestHandler<ParamsDictionary, any, any, TQuery> {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.query);
    if (parsed.success) {
      req.query = parsed.data;
      return next();
    } else {
      return sendErrors([{ type: 'Query', errors: parsed.error }], res);
    }
  };
}

export function processRequest<TParams = any, TQuery = any, TBody = any, THeaders = any>(
  schemas: RequestProcessing<TParams, TQuery, TBody, THeaders>,
): RequestHandler<TParams, any, TBody, TQuery>;
export function processRequest<TParams = any, TQuery = any, TBody = any, THeaders = any>(
  schemas: RequestValidation<TParams, TQuery, TBody, THeaders>,
): RequestHandler<TParams, any, TBody, TQuery>;
export function processRequest<TParams = any, TQuery = any, TBody = any, THeaders = any>(
  schemas: RequestValidation<TParams, TQuery, TBody, THeaders> | RequestProcessing<TParams, TQuery, TBody, THeaders>,
): RequestHandler<TParams, any, TBody, TQuery> {
  return (req, res, next) => {
    const errors: Array<ErrorListItem> = [];
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (parsed.success) {
        req.params = parsed.data;
      } else {
        errors.push({ type: 'Params', errors: parsed.error });
      }
    }
    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (parsed.success) {
        req.query = parsed.data;
      } else {
        errors.push({ type: 'Query', errors: parsed.error });
      }
    }
    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (parsed.success) {
        req.body = parsed.data;
      } else {
        errors.push({ type: 'Body', errors: parsed.error });
      }
    }
    if (schemas.headers) {
      const parsed = schemas.headers.safeParse(req.headers);
      if (parsed.success) {
        req.headers = parsed.data;
      } else {
        errors.push({ type: 'Headers', errors: parsed.error });
      }
    }
    if (errors.length > 0) {
      return sendErrors(errors, res);
    }
    return next();
  };
}

export const validateRequestBody: <TBody>(
  zodSchema: ZodSchema<TBody>,
) => RequestHandler<ParamsDictionary, any, TBody, any> = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (parsed.success) {
    return next();
  } else {
    return sendErrors([{ type: 'Body', errors: parsed.error }], res);
  }
};

export const validateRequestParams: <TParams>(zodSchema: ZodSchema<TParams>) => RequestHandler<TParams, any, any, any> =
  (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (parsed.success) {
      return next();
    } else {
      return sendErrors([{ type: 'Params', errors: parsed.error }], res);
    }
  };

export const validateRequestQuery: <TQuery>(
  zodSchema: ZodSchema<TQuery>,
) => RequestHandler<ParamsDictionary, any, any, TQuery> = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.query);
  if (parsed.success) {
    return next();
  } else {
    return sendErrors([{ type: 'Query', errors: parsed.error }], res);
  }
};

export const validateRequest: <TParams = any, TQuery = any, TBody = any, THeaders = any>(
  schemas: RequestValidation<TParams, TQuery, TBody, THeaders>,
) => RequestHandler<TParams, any, TBody, TQuery> =
  ({ params, query, body, headers }) =>
  (req, res, next) => {
    const errors: Array<ErrorListItem> = [];
    if (params) {
      const parsed = params.safeParse(req.params);
      if (!parsed.success) {
        errors.push({ type: 'Params', errors: parsed.error });
      }
    }
    if (query) {
      const parsed = query.safeParse(req.query);
      if (!parsed.success) {
        errors.push({ type: 'Query', errors: parsed.error });
      }
    }
    if (body) {
      const parsed = body.safeParse(req.body);
      if (!parsed.success) {
        errors.push({ type: 'Body', errors: parsed.error });
      }
    }
    if (headers) {
      const parsed = headers.safeParse(req.headers);
      if (!parsed.success) {
        errors.push({ type: 'Headers', errors: parsed.error });
      }
    }
    if (errors.length > 0) {
      return sendErrors(errors, res);
    }
    return next();
  };
