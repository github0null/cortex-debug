import * as ChildProcess from 'child_process';
import { EventEmitter } from "events";
import * as portastic from 'portastic';

export class STUtil extends EventEmitter {
	private process: any;
	private buffer: string;
	private errbuffer: string;
	private initSent: boolean;

	constructor(public application: string, public gdb_port: number, private v1: boolean, private resetOnConnect: boolean = true) {
		super();

		this.initSent = false;
		this.buffer = "";
		this.errbuffer = "";
	}

	init(): Thenable<any> {
		return new Promise((resolve, reject) => {
			let args = ["-p", this.gdb_port.toString(), '-v'];
			if (this.v1) {
				args.push('--stlinkv1');
			}
			if (!this.resetOnConnect) {
				args.push('--no-reset');
			}

			this.process = ChildProcess.spawn(this.application, args, {});
			this.process.stdout.on('data', this.stdout.bind(this));
			this.process.stderr.on('data', this.stderr.bind(this));
			this.process.on("exit", (() => { this.emit("quit"); }).bind(this));
			this.process.on("error", ((err) => { this.emit("launcherror", err); }).bind(this));
			setTimeout(resolve, 50);
		});
	}

	exit() : void {
		this.process.kill();
	}

	error() : void {
		
	}

	close(code, signal) {
		console.log('Closed st-util with ', code, signal);
	}

	stdout(data) {
		if (typeof data =="string")
			this.buffer += data;
		else
			this.buffer += data.toString("utf8");
		
		let end = this.buffer.lastIndexOf('\n');
		if (end != -1) {
			this.onOutput(this.buffer.substr(0, end));
			this.buffer = this.buffer.substr(end + 1);
		}
	}

	stderr(data) {
		if (typeof data == "string")
			this.errbuffer += data;
		else
			this.errbuffer += data.toString("utf8");

		// st-util prints information to stderr rather than stdout
		if (this.errbuffer.indexOf(`Listening at *:${this.gdb_port}...`) !== -1) {
			if (!this.initSent) {
				this.emit('stutil-init');
				this.initSent = true;
			}
		}
		
		let end = this.errbuffer.lastIndexOf('\n');
		if(end != -1) {
			this.onOutput(this.errbuffer.substr(0, end));
			this.errbuffer = this.errbuffer.substr(end + 1);
		}
	}

	stop() {
		this.process.kill();
	}

	onOutput(text: string) {
		this.emit('stutil-output', text);
	}

	onErrOutput(text: string) {
		this.emit('stutil-stderr', text);
	}
}