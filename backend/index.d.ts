declare module '@semapps/webacl' {
  export const GroupsManagerBot;
  export const AuthorizerBot;
  export const WebAclService: {
    name: string;
    settings: {
      baseUrl: null;
      graphName: string;
      podProvider: boolean;
      superAdmins: never[];
    };
    dependencies: string[];
    created(): Promise<void>;
    started(): Promise<void>;
  };
  export const WebAclMiddleware: (opts: {
    baseUrl: string;
    podProvider?: boolean;
    graphName?: string;
  }) => import('moleculer').Middleware;
  export const CacherMiddleware: (opts: any) => import('moleculer').Middleware; /* {
    name: string;
    created(broker: any): void;
    localAction(next: any, action: any): any;
  } */
}
