import Command from '../utils/command';
import terminalLink from 'terminal-link';

export default class Browse extends Command {
  public static description = 'list templates';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} browse`,
  ];

  public static args = [];

  public static strict = true;

  public async run() {
    this.parse(Browse);
    const templates = await this.lycanClient.listTemplates();
    if (templates.length === 0) {
      this.log('Sorry. Templates are not available yet.');
      return;
    }
    for (const { id, name, previewImageUrl, githubUrl} of templates) {
      const previewImageLink = terminalLink('preview image', previewImageUrl);
      const githubLink = terminalLink('source', githubUrl);
      this.log(`${name}: See ${previewImageLink}, get the ${githubLink} from GitHub, or try it with '${Command.cliBinName} try ${id}'`);
    }
  }
}
