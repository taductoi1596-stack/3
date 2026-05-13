const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

const config = {
    host: 'ductoi1996.synology.me',
    username: 'taductoi',
    password: 'Toi0869041596@',
    port: 22,
    tryKeyboard: true,
    onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
        if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish(['Toi0869041596@']);
        } else {
            finish([]);
        }
    }
};

const localDir = 'C:/Users/taduc/Desktop/180426/web-react/web';
const remoteDir = '/volume1/docker/web-react';

async function deploy() {
    try {
        console.log('Connecting to NAS...');
        await ssh.connect(config);
        console.log('Connected!');

        console.log(`Creating remote directory ${remoteDir}...`);
        await ssh.execCommand(`mkdir -p ${remoteDir}`);

        console.log('Uploading files...');
        
        // Upload Dockerfile
        await ssh.putFile(path.join(localDir, 'Dockerfile'), `${remoteDir}/Dockerfile`);
        console.log('Uploaded Dockerfile');
        
        // Upload docker-compose.yml
        await ssh.putFile(path.join(localDir, 'docker-compose.yml'), `${remoteDir}/docker-compose.yml`);
        console.log('Uploaded docker-compose.yml');

        // Upload nginx.conf
        await ssh.putFile(path.join(localDir, 'nginx.conf'), `${remoteDir}/nginx.conf`);
        console.log('Uploaded nginx.conf');

        // Upload build directory
        const failed = [];
        const successful = [];
        await ssh.putDirectory(path.join(localDir, 'build'), `${remoteDir}/build`, {
            recursive: true,
            concurrency: 5,
            tick: function(localPath, remotePath, error) {
                if (error) {
                    failed.push(localPath);
                } else {
                    successful.push(localPath);
                }
            }
        });
        console.log(`Uploaded build directory. Success: ${successful.length}, Failed: ${failed.length}`);
        
        if (failed.length > 0) {
            console.error('Failed to upload some files:', failed);
        }

        console.log('Running docker-compose up -d --build...');
        const result = await ssh.execCommand(`echo "${config.password}" | sudo -S docker-compose up -d --build`, { 
            cwd: remoteDir,
            execOptions: { pty: true }
        });
        
        console.log('STDOUT:', result.stdout);
        console.log('STDERR:', result.stderr);

        console.log('Deployment completed successfully!');
    } catch (err) {
        console.error('Deployment failed:', err);
    } finally {
        ssh.dispose();
    }
}

deploy();
