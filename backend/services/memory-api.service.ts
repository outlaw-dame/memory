import authRoutes from './routes/auth';

export default {
  name: 'memoryapi',

  actions: {
    ...authRoutes
  }
};
