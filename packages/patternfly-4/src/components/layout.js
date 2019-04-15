import React from 'react';
import PropTypes from 'prop-types';
import { StaticQuery, graphql, withPrefix, Link, navigate } from 'gatsby';
import Header from './header';
import Footer from './footer/footer';
import {
  Brand,
  Button,
  Nav,
  NavItem,
  NavList,
  NavVariants,
  Page,
  PageHeader,
  PageSection,
  PageSectionVariants,
  PageSidebar,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  Form,
  TextInput
} from '@patternfly/react-core';
import { Location } from '@reach/router';
import brandImg from '../images/PatternFly_logo.svg';
import {TimesIcon} from '@patternfly/react-icons';
import Styles from '../components/banner.scss';

class Layout extends React.Component {

  componentDidMount() {
    // eslint-disable-next-line no-undef
    if (window.docsearch) {
      window.docsearch({
        apiKey: '06941733239da4f8617d272cf2ed4d5c',
        indexName: 'patternfly',
        inputSelector: '#global-search-input',
        debug: true // Set debug to true if you want to inspect the dropdown
      });
    } else {
      console.warn('Search has failed to load');
    }
  }

  onLogoClick = () => {
    navigate('/');
  }

  render() {
    const { tertiaryNav, sideNav } = this.props;

    return (<StaticQuery query={graphql`
      query SiteTitleQuery {
        site {
          siteMetadata {
            title
          }
        }
        allMainNavigationJson {
          edges {
            node {
              text
              path
            }
          }
        }
      }
    `} render={data => {
      const PageNav = (
        <Location>
          {({ location }) => {
            // console.log(location);
            const currentPath = location.pathname;
            return (
              <Nav aria-label="Nav">
                <NavList variant={NavVariants.horizontal}>
                  {data.allMainNavigationJson.edges.map(item => {
                    const { node } = item;
                    const startPath = `/${node.path.split('/')[1]}/`;
                    return (
                      <NavItem key={node.path} isActive={currentPath.indexOf(startPath) > -1}>
                        <Link to={node.path}>{node.text}</Link>
                      </NavItem>
                    )
                  })}
                </NavList>
              </Nav>
            );
          }}
        </Location>
      );
      const PageToolbar = (
        <Toolbar>
          <ToolbarGroup>
            <ToolbarItem>
              <Form className="ws-search" onSubmit={event => { event.preventDefault(); return false; }}>
                <TextInput
                  type="text"
                  id="global-search-input"
                  name="global-search-input"
                  placeholder="Search"
                />
              </Form>
            </ToolbarItem>
          </ToolbarGroup>
        </Toolbar>
      );
      const logoProps = {
        onClick: this.onLogoClick
      };
      const SiteHeader = (
        <PageHeader
          className="pf4-site-header"
          showNavToggle={sideNav !== null}
          logoProps={logoProps}
          logo={<Brand src={brandImg} alt="PatternFly Logo"/>}
          topNav={PageNav}
          toolbar={PageToolbar}
        />
      );

      return (
        <>
          <div class="pf-l-flex pf-m-justify-content-space-between">
            <div class="pf-u-my-md">
            <span class="pf-u-ml-xl custom-text-hide">Looking for PatternFly 3? All documentation and code examples are still available.</span>
            <a href="" style={{fontWeight: 900, textDecoration: 'none'}} class="pf-u-mx-md custom-text-link">Go to PatternFly 3<i class="fas fa-arrow-right pf-u-mx-sm"></i></a>
            </div>
            <div class="pf-u-mr-xl custom-close-button">
              <Button variant="plain" aria-label="Action">
                  <TimesIcon />
              </Button>
            </div>
          </div>
          <Header siteTitle={data.site.siteMetadata.title} />
          <Page isManagedSidebar={sideNav !== null} header={SiteHeader} sidebar={sideNav ? <PageSidebar nav={sideNav} /> : null}>
            {tertiaryNav && <PageSection variant={PageSectionVariants.light}>
              {tertiaryNav}
            </PageSection>}
            {this.props.children}
          </Page>
          <Footer></Footer>
        </>
      )
      }} />);
  }

}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  tertiaryNav: PropTypes.node,
  sideNav: PropTypes.node,
  activeNavItem: PropTypes.number
}

Layout.defaultProps = {
  tertiaryNav: null,
  sideNav: null,
  activeNavItem: 0
};

export default Layout
