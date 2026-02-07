


import fs from 'fs' 
import path from 'path'
 
export default class FileUtils{


   static readJsonFileSync(filePath){
         // Default: prepend cwd (original behavior, works for all existing callers
         // like '/pool.config.json', '/src/contracts/...', '/sslconfig.json', etc.)
         const cwdPath = path.resolve() + filePath;

         // If the cwd-relative path exists, use it (covers all non-Docker callers).
         // Otherwise, if the path is absolute and exists on its own, use it as-is
         // (covers Docker POOL_CONFIG_PATH like '/app/config/pool.config.json').
         if (fs.existsSync(cwdPath)) {
             return JSON.parse(fs.readFileSync(cwdPath, 'utf8'));
         } else if (path.isAbsolute(filePath)) {
             return JSON.parse(fs.readFileSync(filePath, 'utf8'));
         }
         // Neither exists — fall through to original path for standard error message
         return JSON.parse(fs.readFileSync(cwdPath, 'utf8'));

    }

}