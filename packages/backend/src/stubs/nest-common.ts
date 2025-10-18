function noop() {
  return undefined
}

export function Injectable(): ClassDecorator {
  return (_target: Function) => noop()
}

export function Controller(_path?: string): ClassDecorator {
  return (_target: Function) => noop()
}

export function Post(_path?: string): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, _descriptor: PropertyDescriptor) => noop()
}

export function Body(_property?: string): ParameterDecorator {
  return (_target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) => noop()
}

export function UseGuards(..._guards: unknown[]): ClassDecorator & MethodDecorator {
  const decorator = (
    _target: object | Function,
    _propertyKey?: string | symbol,
    _descriptor?: PropertyDescriptor,
  ) => noop()
  return decorator as ClassDecorator & MethodDecorator
}

export function Param(_property?: string): ParameterDecorator {
  return (_target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) => noop()
}

export class HttpException extends Error {
  constructor(public readonly message: string, public readonly status: number) {
    super(message)
    this.name = this.constructor.name
  }

  getStatus(): number {
    return this.status
  }

  getResponse() {
    return { message: this.message, status: this.status }
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request') {
    super(message, 400)
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(message, 404)
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict') {
    super(message, 409)
  }
}

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
} as const
