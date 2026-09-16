import type { Schema, Struct } from '@strapi/strapi';

export interface DirectorGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_director_gallery_items';
  info: {
    description: "A single film entry: main media plus the grid's rest/hover pair";
    displayName: 'Director Gallery Item';
    icon: 'film';
  };
  attributes: {
    client: Schema.Attribute.String;
    hover: Schema.Attribute.Media<'images' | 'videos'>;
    image: Schema.Attribute.Media<'images' | 'videos'>;
    thumbnail: Schema.Attribute.Media<'images' | 'videos'>;
    title: Schema.Attribute.String;
  };
}

export interface DirectorGalleryRow extends Struct.ComponentSchema {
  collectionName: 'components_director_gallery_rows';
  info: {
    description: 'A row grouping a set of film gallery items';
    displayName: 'Director Gallery Row';
    icon: 'grid';
  };
  attributes: {
    items: Schema.Attribute.Component<'director.gallery-item', true>;
  };
}

export interface HeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_hero_slides';
  info: {
    description: 'A hero slide: media paired with the director or photographer it links to';
    displayName: 'Slide';
    icon: 'picture';
  };
  attributes: {
    director: Schema.Attribute.Relation<'oneToOne', 'api::director.director'>;
    duration: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    media: Schema.Attribute.Media<'images' | 'videos'>;
    photographer: Schema.Attribute.Relation<
      'oneToOne',
      'api::photographer.photographer'
    >;
  };
}

export interface InfoColorScheme extends Struct.ComponentSchema {
  collectionName: 'components_info_color_schemes';
  info: {
    description: 'A background/text colour pair, rotated one per load on the Info page';
    displayName: 'Color Scheme';
    icon: 'brush';
  };
  attributes: {
    bg: Schema.Attribute.String;
    text: Schema.Attribute.String;
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

export interface PhotographerGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_photographer_gallery_items';
  info: {
    description: 'A single photography entry with its category taxonomy';
    displayName: 'Photographer Gallery Item';
    icon: 'picture';
  };
  attributes: {
    client: Schema.Attribute.String;
    filter: Schema.Attribute.Relation<'oneToMany', 'api::category.category'>;
    image: Schema.Attribute.Media<'images' | 'videos'>;
    title: Schema.Attribute.String;
  };
}

export interface PhotographerGalleryRow extends Struct.ComponentSchema {
  collectionName: 'components_photographer_gallery_rows';
  info: {
    description: 'A row grouping a set of photography gallery items';
    displayName: 'Photographer Gallery Row';
    icon: 'grid';
  };
  attributes: {
    items: Schema.Attribute.Component<'photographer.gallery-item', true>;
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

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Search-engine and social-sharing metadata for a page. All fields optional \u2014 the frontend falls back to sensible defaults when empty.';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    noIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    ogImage: Schema.Attribute.Media<'images'>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'director.gallery-item': DirectorGalleryItem;
      'director.gallery-row': DirectorGalleryRow;
      'hero.slide': HeroSlide;
      'info.color-scheme': InfoColorScheme;
      'info.office': InfoOffice;
      'info.team-member': InfoTeamMember;
      'photographer.gallery-item': PhotographerGalleryItem;
      'photographer.gallery-row': PhotographerGalleryRow;
      'shared.link': SharedLink;
      'shared.seo': SharedSeo;
    }
  }
}
