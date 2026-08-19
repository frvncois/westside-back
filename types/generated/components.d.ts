import type { Schema, Struct } from '@strapi/strapi';

export interface HeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_hero_slides';
  info: {
    description: 'A hero slide: media paired with a repertory reference';
    displayName: 'Slide';
    icon: 'picture';
  };
  attributes: {
    media: Schema.Attribute.Media<'images' | 'videos'>;
    repertory: Schema.Attribute.Relation<
      'oneToOne',
      'api::repertory.repertory'
    >;
  };
}

export interface InfoOffice extends Struct.ComponentSchema {
  collectionName: 'components_info_offices';
  info: {
    description: 'Office contact details';
    displayName: 'Office';
    icon: 'briefcase';
  };
  attributes: {
    address: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    phone: Schema.Attribute.String;
  };
}

export interface InfoTeamMember extends Struct.ComponentSchema {
  collectionName: 'components_info_team_members';
  info: {
    description: "A team member's contact details";
    displayName: 'Team Member';
    icon: 'user';
  };
  attributes: {
    email: Schema.Attribute.Email;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface RepertoryGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_repertory_gallery_items';
  info: {
    description: 'A single gallery entry with its taxonomy';
    displayName: 'Gallery Item';
    icon: 'picture';
  };
  attributes: {
    client: Schema.Attribute.String;
    filter: Schema.Attribute.Relation<'oneToMany', 'api::category.category'>;
    image: Schema.Attribute.Media<'images' | 'videos'>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['films', 'photography']>;
  };
}

export interface RepertoryGalleryRow extends Struct.ComponentSchema {
  collectionName: 'components_repertory_gallery_rows';
  info: {
    description: 'A reusable accordion row grouping a set of gallery items';
    displayName: 'Gallery Row';
    icon: 'grid';
  };
  attributes: {
    items: Schema.Attribute.Component<'repertory.gallery-item', true>;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    description: 'A titled hyperlink';
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'hero.slide': HeroSlide;
      'info.office': InfoOffice;
      'info.team-member': InfoTeamMember;
      'repertory.gallery-item': RepertoryGalleryItem;
      'repertory.gallery-row': RepertoryGalleryRow;
      'shared.link': SharedLink;
    }
  }
}
