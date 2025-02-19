import fs from 'fs';
import path from 'path';
import { ServiceBroker } from 'moleculer';

export function loadTsServices(broker: ServiceBroker, servicesDir: string) {
  fs.readdirSync(servicesDir).forEach(file => {
    const filePath = path.join(servicesDir, file);
    const fileStats = fs.statSync(filePath);

    if (fileStats.isDirectory()) {
      loadTsServices(broker, filePath);
    } else if (file.endsWith('.ts')) {
      broker.loadService(filePath);
    }
  });
}
