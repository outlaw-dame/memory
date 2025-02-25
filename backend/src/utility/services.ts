import fs from 'fs';
import path from 'path';
import { ServiceBroker } from 'moleculer';

export function loadTsServices(broker: ServiceBroker, servicesDir: string) {
  const excludedDirs = ['routes'];
  fs.readdirSync(servicesDir).forEach(file => {
    const filePath = path.join(servicesDir, file);
    const fileStats = fs.statSync(filePath);

    if (fileStats.isDirectory() && !excludedDirs.includes(file)) {
      loadTsServices(broker, filePath);
    } else if (file.endsWith('.ts')) {
      broker.loadService(filePath);
    }
  });
}
