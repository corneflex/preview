export type IntOrString = number | string;

export interface Port {
  name: string;
  containerPort?: IntOrString;
  protocol?: string;
  port?: IntOrString;
  targetPort?: IntOrString;
}
