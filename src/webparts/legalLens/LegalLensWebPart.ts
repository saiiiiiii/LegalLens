import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import * as spPropertyPane from '@microsoft/sp-property-pane';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PropertyPaneCustomField: any = (spPropertyPane as any)['PropertyPaneCustomField'];
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'LegalLensWebPartStrings';
import LegalLens from './components/LegalLens';
import { ILegalLensProps } from './components/ILegalLensProps';
import { SharePointService } from './services/SharePointService';
import { AzureAIFoundryService } from './services/AzureAIFoundryService';
import { ILang, LANGS } from './constants/languages';
import { LanguagesPropertyPaneField } from './components/PropertyPane/LanguagesField/LanguagesPropertyPaneField';

export interface ILegalLensWebPartProps {
  description: string;
  contractLibraryUrl: string;
  aiFoundryEndpoint: string;
  aiFoundryApiKey: string;
  aiFoundryDeployment: string;
  documentIntelligenceEndpoint: string;
  documentIntelligenceKey: string;
  enableDocumentAnalysis: boolean;
  translationLanguages: ILang[];
}

export default class LegalLensWebPart extends BaseClientSideWebPart<ILegalLensWebPartProps> {
  private sharePointService: SharePointService;
  private aiFoundryService: AzureAIFoundryService;

  private get effectiveLangs(): ILang[] {
    return this.properties.translationLanguages || LANGS;
  }

  protected onInit(): Promise<void> {
    return super.onInit().then(() => {
      const diEndpoint = this.properties.enableDocumentAnalysis
        ? (this.properties.documentIntelligenceEndpoint || '') : '';
      const diKey = this.properties.enableDocumentAnalysis
        ? (this.properties.documentIntelligenceKey || '') : '';

      const libraryUrl = this.properties.contractLibraryUrl || 'Contracts';
      this.sharePointService = new SharePointService(
        this.context, libraryUrl, diEndpoint, diKey
      );

      this.aiFoundryService = new AzureAIFoundryService(
        this.properties.aiFoundryEndpoint || '',
        this.properties.aiFoundryApiKey || '',
        this.properties.aiFoundryDeployment || 'gpt-4o',
        diEndpoint,
        diKey
      );

      console.log('[WebPart] Services initialized');
      console.log('[WebPart] Document Intelligence:', diEndpoint ? 'Enabled ✓' : 'Disabled - toggle ON in web part settings');
    });
  }

  public render(): void {
    const element: React.ReactElement<ILegalLensProps> = React.createElement(
      LegalLens,
      {
        description: this.properties.description,
        sharePointService: this.sharePointService,
        aiFoundryService: this.aiFoundryService,
        langs: this.effectiveLangs,
        isDarkTheme: this.context.sdks?.microsoftTeams?.context?.theme === 'dark',
        environmentMessage: this._getEnvironmentMessage(),
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        userEmail: this.context.pageContext.user.email,
        context: this.context,
        documentIntelligenceEndpoint: this.properties.enableDocumentAnalysis
          ? (this.properties.documentIntelligenceEndpoint || '') : '',
        documentIntelligenceKey: this.properties.enableDocumentAnalysis
          ? (this.properties.documentIntelligenceKey || '') : ''
      }
    );

    ReactDom.render(element, this.domElement);
  }

  private _getEnvironmentMessage(): string {
    if (!!this.context.sdks.microsoftTeams) {
      return strings.AppTeamsTabEnvironment;
    }
    return strings.AppSharePointEnvironment;
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: 'SharePoint Configuration',
              groupFields: [
                PropertyPaneTextField('description', {
                  label: 'Description'
                }),
                PropertyPaneTextField('contractLibraryUrl', {
                  label: strings.ContractLibraryUrlFieldLabel,
                  description: 'Full URL to SharePoint document library (e.g., https://tenant.sharepoint.com/sites/site/Contracts)',
                  multiline: false
                })
              ]
            },
            {
              groupName: 'Azure AI Foundry Configuration',
              groupFields: [
                PropertyPaneTextField('aiFoundryEndpoint', {
                  label: strings.AIFoundryEndpointFieldLabel,
                  description: 'Azure AI Foundry project endpoint (e.g., https://your-project.openai.azure.com)',
                  multiline: false
                }),
                PropertyPaneTextField('aiFoundryApiKey', {
                  label: strings.AIFoundryApiKeyFieldLabel,
                  description: 'Azure AI Foundry API key',
                  multiline: false
                }),
                PropertyPaneTextField('aiFoundryDeployment', {
                  label: strings.AIFoundryDeploymentFieldLabel,
                  description: 'Model deployment name (e.g., gpt-4, gpt-35-turbo)',
                  multiline: false
                })
              ]
            },
            {
              groupName: 'Document Intelligence (Optional)',
              groupFields: [
                PropertyPaneToggle('enableDocumentAnalysis', {
                  label: 'Enable Document Analysis',
                  onText: 'Enabled',
                  offText: 'Disabled'
                }),
                PropertyPaneTextField('documentIntelligenceEndpoint', {
                  label: strings.DocumentIntelligenceEndpointFieldLabel,
                  description: 'Document Intelligence endpoint (e.g., https://your-di.cognitiveservices.azure.com)',
                  multiline: false,
                  disabled: !this.properties.enableDocumentAnalysis
                }),
                PropertyPaneTextField('documentIntelligenceKey', {
                  label: strings.DocumentIntelligenceKeyFieldLabel,
                  description: 'Document Intelligence API key',
                  multiline: false,
                  disabled: !this.properties.enableDocumentAnalysis
                })
              ]
            },
            {
              groupName: 'Translation Languages',
              groupFields: [
                PropertyPaneCustomField({
                  key: 'translationLanguages',
                  onRender: (elem: HTMLElement) => {
                    ReactDom.render(
                      React.createElement(LanguagesPropertyPaneField, {
                        langs: this.effectiveLangs,
                        onChange: (newLangs: ILang[]) => {
                          this.properties.translationLanguages = newLangs;
                          this.render();
                        }
                      }),
                      elem
                    );
                  },
                  onDispose: (elem: HTMLElement) => {
                    ReactDom.unmountComponentAtNode(elem);
                  }
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
